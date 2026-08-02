#include <cmath>
#include <crow.h>
#include <crow/middlewares/cors.h>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

using namespace std;

struct GameState {
  char board[25];
  char turn;
  int unplacedGoats;
  int capturedGoats;
  string lastMove;
  string moveTag;
};

struct Direction {
  int dr;
  int dc;
};

struct Move {
  int from;
  int to;
  bool isCaptured;
  int capturedIdx;
};

struct CaptureJump {
  int to;
  int midpoint;
};

const std::vector<int> legalMovesConnMatrix[25] = {
    {1, 5, 6},
    {2, 0, 6},
    {3, 1, 7, 6, 8},
    {4, 2, 8},
    {3, 9, 8},
    {6, 10, 0},
    {7, 5, 11, 1, 10, 2, 12, 0},
    {8, 6, 12, 2},
    {9, 7, 13, 3, 12, 4, 14, 2},
    {8, 14, 4},
    {11, 15, 5, 6, 16},
    {12, 10, 16, 6},
    {13, 11, 17, 7, 16, 8, 18, 6},
    {14, 12, 18, 8},
    {13, 19, 9, 18, 8},
    {16, 20, 10},
    {17, 15, 21, 11, 20, 12, 22, 10},
    {18, 16, 22, 12},
    {19, 17, 23, 13, 22, 14, 24, 12},
    {18, 24, 14},
    {21, 15, 16},
    {22, 20, 16},
    {23, 21, 17, 18, 16},
    {24, 22, 18},
    {23, 19, 18}};

const std::vector<CaptureJump> captureMoveConnMatrix[25] = {
    {{2, 1}, {10, 5}, {12, 6}},
    {{3, 2}, {11, 6}},
    {{4, 3}, {0, 1}, {12, 7}, {10, 6}, {14, 8}},
    {{1, 2}, {13, 8}},
    {{2, 3}, {14, 9}, {12, 8}},
    {{7, 6}, {15, 10}},
    {{8, 7}, {16, 11}, {18, 12}},
    {{9, 8}, {5, 6}, {17, 12}},
    {{6, 7}, {18, 13}, {16, 12}},
    {{7, 8}, {19, 14}},
    {{12, 11}, {20, 15}, {0, 5}, {2, 6}, {22, 16}},
    {{13, 12}, {21, 16}, {1, 6}},
    {{14, 13}, {10, 11}, {22, 17}, {2, 7}, {20, 16}, {4, 8}, {24, 18}, {0, 6}},
    {{11, 12}, {23, 18}, {3, 8}},
    {{12, 13}, {24, 19}, {4, 9}, {22, 18}, {2, 8}},
    {{17, 16}, {5, 10}},
    {{18, 17}, {6, 11}, {8, 12}},
    {{19, 18}, {15, 16}, {7, 12}},
    {{16, 17}, {8, 13}, {6, 12}},
    {{17, 18}, {9, 14}},
    {{22, 21}, {10, 15}, {12, 16}},
    {{23, 22}, {11, 16}},
    {{24, 23}, {20, 21}, {12, 17}, {14, 18}, {10, 16}},
    {{21, 22}, {13, 18}},
    {{22, 23}, {14, 18}, {12, 18}}};

const int tigerPositionWeights[25]{6,  5,  10, 5,  6,  5,  11, 7,  11,
                                   5,  10, 7,  16, 7,  10, 5,  11, 7,
                                   11, 5,  6,  5,  10, 5,  6};

GameState parseObx(const string &obx) {
  GameState state;
  stringstream ss(obx);
  string bStateStr, turnStr, unplacedStr, capStr, moveStr, tagStr;
  ss >> bStateStr >> turnStr >> unplacedStr >> capStr;
  if (!(ss >> moveStr))
    moveStr = "-";
  if (!(ss >> tagStr))
    tagStr = "#";
  int bIdx = 0;
  for (char ch : bStateStr) {
    if (ch != '/') {
      state.board[bIdx++] = ch;
    }
  }
  state.turn = turnStr[0];
  state.unplacedGoats = stoi(unplacedStr.substr(1));
  state.capturedGoats = stoi(capStr.substr(1));
  state.lastMove = moveStr;
  state.moveTag = tagStr;
  return state;
}

ostream &operator<<(ostream &os, const GameState &state) {
  os << "GAME STATE: \nTURN: " << state.turn
     << "\nUNPLACED: " << state.unplacedGoats
     << "\nCAPTURED: " << state.capturedGoats << endl;
  return os;
}



string decodeUrl(const string &str) {
  string result = "";
  for (size_t i = 0; i < str.length(); i++) {
    if (str[i] == '%' && i + 2 < str.length() && str[i + 1] == '2' &&
        (str[i + 2] == '0')) {
      result += ' ';
      i += 2;
    } else if (str[i] == '+') {
      result += ' ';
    } else {
      result += str[i];
    }
  }
  return result;
}

string indexToCoord(int idx) {
  int r = idx / 5;
  int c = idx % 5;
  char colChar = 'A' + c;
  char rowChar = '1' + r;
  return string(1, colChar) + string(1, rowChar);
}

int coordToIndex(const string &coord) {
  if (coord.length() < 2)
    return -1;
  int c = coord[0] - 'A';
  int r = coord[1] - '1';
  return (r * 5) + c;
}

string toObx(const GameState &state, const string &executedMoveStr) {
  string obx = "";
  for (int i = 0; i < 25; i++) {
    if (i > 0 && i % 5 == 0) {
      obx += "/";
    }
    obx += state.board[i];
  }
  obx += " ";
  obx += state.turn;
  obx += " @" + to_string(state.unplacedGoats);
  obx += " ";
  obx += " c" + to_string(state.capturedGoats);
  obx += " " + executedMoveStr;
  obx += " " + state.moveTag;
  return obx;
}

void printBoard(char b[]) {
  for (int i = 0; i < 25; i++) {
    if (i % 5 == 0 && i != 0)
      cout << endl;
    cout << b[i] << "\t";
  }
  cout << endl;
}

bool hasDiagonals(int row, int col) {
  if ((row + col) % 2 == 0) {
    return true;
  } else {
    return false;
  }
}

bool placeGoat(char b[], int targetIdx) {
  if (b[targetIdx] == 'X') {
    b[targetIdx] = 'G';
    return true;
  } else {
    cout << "occupied" << endl;
    return false;
  }
}

std::vector<Move> generateMoves(const GameState &state) {
  std::vector<Move> moves;

  if (state.turn == 'g' && state.unplacedGoats > 0) {
    for (int i = 0; i < 25; i++) {
      if (state.board[i] == 'X') {
        moves.push_back({-1, i, false, -1});
      }
    }
    return moves;
  }

  char currentPiece = (state.turn == 'g') ? 'G' : 'T';

  for (int from = 0; from < 25; from++) {
    if (state.board[from] == currentPiece) {
      for (int to : legalMovesConnMatrix[from]) {
        if (state.board[to] == 'X') {
          moves.push_back({from, to, false, -1});
        }
      }

      if (currentPiece == 'T') {
        for (const auto &jump : captureMoveConnMatrix[from]) {
          if (state.board[jump.to] == 'X' &&
              state.board[jump.midpoint] == 'G') {
            moves.push_back({from, jump.to, true, jump.midpoint});
          }
        }
      }
    }
  }
  return moves;
}

GameState applyMove(const GameState &current, const Move &move) {
  GameState nextState = current;

  if (current.turn == 'g' && move.from == -1) {
    nextState.board[move.to] = 'G';
    nextState.unplacedGoats--;
    nextState.lastMove = indexToCoord(move.to);
  } else {
    char temp = nextState.board[move.from];
    nextState.board[move.from] = 'X';
    nextState.board[move.to] = temp;
    if (move.isCaptured) {
      nextState.capturedGoats++;
      nextState.board[move.capturedIdx] = 'X';
      nextState.lastMove = indexToCoord(move.from) + indexToCoord(move.to);

    } else {
      nextState.lastMove = indexToCoord(move.from) + indexToCoord(move.to);
    }
  }

  nextState.turn = (current.turn == 'g') ? 't' : 'g';
  return nextState;
}

int evaluateBoard(const GameState &state) {
  if (state.capturedGoats >= 5) {
    return 10000;
  }

  GameState tempState = state;
  tempState.turn = 't';
  int tigerMovesCount = 0;
  for (int from = 0; from < 25; ++from) {
    if (state.board[from] == 'T') {
      for (int to : legalMovesConnMatrix[from]) {
        if (state.board[to] == 'X')
          tigerMovesCount++;
      }

      for (const auto &jump : captureMoveConnMatrix[from]) {
        if (state.board[jump.to] == 'X' && state.board[jump.midpoint] == 'G') {
          tigerMovesCount++;
        }
      }
    }
  }

  if (tigerMovesCount == 0) {
    return -10000;
  }
  int score = 0;
  score += state.capturedGoats *1200;

  //if ate 4 goats-> urgently hunts for the 5th one 
  if(state.capturedGoats==4){
    score+=800;
  }

  for (int i = 0; i < 25; ++i) {
    if (state.board[i] == 'T') {
      score += tigerPositionWeights[i] * 20;
    } else if (state.board[i] == 'G') {
      score -= tigerPositionWeights[i] * 5;
    }
  }
  return score;
}

int minimax(GameState state, int depth, int alpha, int beta,
            bool isMaximizing) {
  if (depth == 0 || state.capturedGoats >= 5) {
    return evaluateBoard(state);
  }

  vector<Move> moves = generateMoves(state);

  if (moves.empty()) { // no legal moves left
    return evaluateBoard(state);
  }

  if (isMaximizing) { // bagh turn
    int maxScore = -100000;
    for (const auto &move : moves) {
      GameState nextState = applyMove(state, move);
      int eval = minimax(nextState, depth - 1, alpha, beta, false);
      maxScore = max(maxScore, eval);
      alpha = max(alpha, eval);

      if (beta <= alpha) {
        break;
      }
    }
    return maxScore;
  } else { // goat turn
    int minScore = 100000;
    for (const auto &move : moves) {
      GameState nextState = applyMove(state, move);
      int eval = minimax(nextState, depth - 1, alpha, beta, true);
      minScore = min(minScore, eval);
      beta = min(beta, eval);

      if (beta <= alpha) {
        break;
      }
    }
    return minScore;
  }
}

Move getBestMove(const GameState &state, int depth, int &bestScore) {
  vector<Move> moves = generateMoves(state);
  Move bestMove = moves[0];
  bool isTiger = (state.turn == 't');
  int bestVal = isTiger ? -100000 : 100000;
  for (const auto &move : moves) {
    GameState nextState = applyMove(state, move);
    int moveVal = minimax(nextState, depth - 1, -100000, 100000, !isTiger);

    if (isTiger) {
      if (moveVal > bestVal) {
        bestVal = moveVal;
        bestMove = move;
      }
    } else {
      if (moveVal < bestVal) {
        bestVal = moveVal;
        bestMove = move;
      }
    }
  }

  bestScore = bestVal;
  return bestMove;
}

int main() {
  char board[25];
  for (int i = 0; i < 25; i++) {
    if (i == 0 || i == 4 || i == 20 || i == 24) {
      board[i] = 'T';
    } else {
      board[i] = 'X';
    }
  }

  crow::App<crow::CORSHandler> app;

  auto &cors = app.get_middleware<crow::CORSHandler>();
  cors.global()
      .headers("X-Requested-With", "Content-Type",
               "Access-Control-Allow-Origin",
               "Access-Control-Allow-Private-Network")
      .methods("GET"_method, "OPTIONS"_method)
      .origin("*");

  CROW_ROUTE(app, "/").methods("GET"_method, "OPTIONS"_method)(
      [](const crow::request &req, crow::response &res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Private-Network", "true");
        res.set_header("Content-Type", "text/plain");

        if (req.method == crow::HTTPMethod::OPTIONS) {
          res.code = 200;
          res.end();
          return;
        }

        auto raw_obx = req.url_params.get("obx");

        if (raw_obx != nullptr) {
          string decoded_obx = decodeUrl(string(raw_obx));

          try {
            GameState state = parseObx(decoded_obx);

            vector<Move> legalMoves = generateMoves(state);

            if (!legalMoves.empty()) {

              int bestScore = 0;
              Move bestMove = getBestMove(state, 6, bestScore);
              GameState nextState = applyMove(state, bestMove);
              string responseObx = toObx(nextState, nextState.lastMove);

              res.code = 200;
              res.body = "{\"obx\":\"" + responseObx + "\"}";
              cout << "\n========================================" << endl;
              cout << "MOVE EXECUTED: " << nextState.lastMove << endl;
              cout << "NEW OBX: " << responseObx << endl;
              cout << "EVAL SCORE: " << bestScore << endl;
              cout << "========================================" << endl;
            } else {
              string responseObx = toObx(state, "-");
              res.code = 200;
              res.body = "{\"obx\":\"" + responseObx + "\"}";
            }

          } catch (const exception &e) {
            res.code = 400;
            res.body = "{\"error\":\"Failed to parse OBX string\"}";
          }
        } else {
          res.code = 400;
          res.body = "{\"error\":\"Missing 'obx' parameter\"}";
        }

        res.end();
      });

  cout << "\n==================================================" << endl;
  cout << "  BAGHCHAL ENGINE SERVER RUNNING AT PORT 8080" << endl;
  cout << "  URL: http://localhost:8080" << endl;
  cout << "==================================================\n" << endl;

  app.port(8080).multithreaded().run();
  return 0;
}

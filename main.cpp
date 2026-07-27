#include <iostream>
#include <vector>
#include <cmath>
#include <sstream>
#include <string>
#include <crow.h>
#include <crow/middlewares/cors.h>

using namespace std;

struct GameState {
    char board[25];
    char turn;
    int unplacedGoats;
    int capturedGoats;
    string lastMove;
    string moveTag;
};

GameState parseObx(const string& obx){
    GameState state;
    stringstream ss(obx);
    string bStateStr, turnStr,unplacedStr,capStr,moveStr,tagStr;
    ss>>bStateStr>>turnStr>>unplacedStr>>capStr;
    if(!(ss>>moveStr)) moveStr="-";
    if(!(ss>>tagStr)) tagStr="#";
    int bIdx=0;
    for(char ch:bStateStr){
        if(ch!='/'){
            state.board[bIdx++]=ch;
        }
    }
    state.turn=turnStr[0];
    state.unplacedGoats=stoi(unplacedStr.substr(1));
    state.capturedGoats=stoi(capStr.substr(1));
    state.lastMove=moveStr;
    state.moveTag=tagStr;
    return state;
}

ostream& operator<<(ostream& os, const GameState& state){
    os<<"GAME STATE: \nTURN: "<<state.turn<<"\nUNPLACED: "<<state.unplacedGoats<<"\nCAPTURED: "<<state.capturedGoats<<endl;
    return os;
}


string decodeUrl(const string& str){
    string result="";
    for(size_t i=0;i<str.length();i++){
        if(str[i]=='%'&& i+2 <str.length() && str[i+1]=='2'&&(str[i+2]=='0')){
            result+=' ';
            i+=2;
        } else if (str[i]=='+'){
            result+=' ';
        } else {
            result+=str[i];
        }
    }
    return result;
}

struct Direction{
    int dr;
    int dc;
};

vector<Direction> getValidDirs(int r,int c){
    vector<Direction> dirs = { 
        //u l d r
        {-1,0},
        {1,0},
        {0,-1},
        {0,1}
    };
    if((r+c)%2==0){
        //ul ur dl dr
        dirs.push_back({-1,-1});
        dirs.push_back({-1,1});
        dirs.push_back({1,-1});
        dirs.push_back({1,1});
    }
    return dirs;
}

string indexToCoord(int idx){
    int r=idx/5;
    int c=idx%5;
    char colChar='A'+c;
    char rowChar='1'+r;
    return string(1,colChar)+string(1,rowChar);
}

int coordToIndex(const string& coord){
    if(coord.length()<2) return -1;
    int c=coord[0]-'A';
    int r=coord[1]-'1';
    return (r*5)+c;
}

string toObx(const GameState& state, const string& executedMoveStr){
    string obx="";
    for(int i=0;i<25;i++){
        if(i>0&&i%5==0){
            obx+="/";
        }
        obx+=state.board[i];
    }
    obx+=" ";
    obx+=state.turn;
    obx+=" @"+to_string(state.unplacedGoats);
    obx+=" ";
    obx+=" c"+to_string(state.capturedGoats);
    obx+=" "+executedMoveStr;
    obx+=" "+state.moveTag;
    return obx;
}


void printBoard(char b[]){
    for(int i=0;i<25;i++){
        if(i%5==0&&i!=0) cout<<endl;
        cout<<b[i]<<"\t";
    }
    cout<<endl;
}

bool hasDiagonals(int row, int col){
    if((row+col)%2==0){
        return true;
    } else {
        return false;
    }
}

void validMoves(int move){
    int nidx;
    int r=move/5;
    int c=move%5;
    for(auto dir:getValidDirs(r,c)){
        int nr=r+dir.dr;
        int nc=c+dir.dc;
        if(nr>= 0&&nr <5&&nc>=0&&nc < 5){
            nidx=(nr*5)+nc;
            cout<<nidx<<"\n";
        }
    }
}

void validCaptures(char b[], int tigerIdx){
    int r=tigerIdx/5;
    int c=tigerIdx%5;
    for(auto dir:getValidDirs(r,c)){
        int gr=r+dir.dr;
        int gc=c+dir.dc;
        int tr=r+(2*dir.dr);
        int tc=c+(2*dir.dc);
        if(tr>=0&&tr<5&&tc>=0&&tc<5){
            int goatIdx=(gr*5)+gc;
            int landIdx=(tr*5)+tc;
            if(b[goatIdx]=='G'&&b[landIdx]=='X'){
                cout<<"valid jump for tiger at "<< tigerIdx<< " to jump to "<<landIdx<<" over the goat at "<<goatIdx <<endl;
            }
        }
    }
}

bool placeGoat(char b[],int targetIdx){
    if(b[targetIdx]=='X'){
        b[targetIdx]='G';
        return true;
    } else {
        cout<<"occupied"<<endl;
        return false;
    }
}

bool isValidOneStep(int r1,int c1, int r2,int c2){
    for(auto dir:getValidDirs(r1,c1)){
        int nextR=r1+dir.dr;
        int nextC=c1+dir.dc;
        if(nextR==r2&&nextC==c2){
            return true;
        }
    }
    return false;
}

bool movePiece(char b[], int fromIdx, int toIdx, int &goatsCap){
    if(b[toIdx]!='X'){
        cout<<"occupied"<<endl;
        return false;
    }
    int r1=fromIdx/5,c1=fromIdx%5;
    int r2=toIdx/5,c2=toIdx%5;
    int dr=abs(r2-r1);
    int dc=abs(c2-c1);
    if(isValidOneStep(r1,c1,r2,c2)){
        b[toIdx]=b[fromIdx];
        b[fromIdx]='X';
        return true;
    }
    if((dr==2||dc==2)&&b[fromIdx]=='T'){
        int rg=(r1+r2)/2;
        int cg=(c1+c2)/2;
        if(isValidOneStep(r1,c1,rg,cg)){
            int goatIdx=(rg*5)+cg;
            if(b[goatIdx]=='G'){
                b[goatIdx]='X';
                b[toIdx]='T';
                b[fromIdx]='X';
                goatsCap++;
                cout<<"goat captured at ("<<rg<<","<<cg<<"):"<<endl;
                return true;
            }
        }
    }
    cout<<"invalid move!"<<endl;
    return false;
}



int main(){
    char board[25];
    for(int i=0;i<25;i++){
        if(i==0||i==4||i==20||i==24){
           board[i]='T'; 
        } else {
            board[i]='X';
        }
    }
    // printBoard(board);
    // cout<<endl;
    // placeGoat(board,5);    
    // printBoard(board);
    // cout<<endl;
    // movePiece(board,5,6,goatsCap);
    // printBoard(board);
    // cout<<endl;
    // movePiece(board,0,12,goatsCap);
    // printBoard(board);
    // cout<<endl;
    // cout<<parseObx("TXXXT/XXXXX/XXGXX/XXXXX/TXXXT g @19 c0 - -")<<endl;

    // string myObx = "TXXXT/XXXXX/XXGXX/XXXXX/TXXXT g @19 c0 - -";
    // GameState state=parseObx(myObx);
    // cout<<state<<endl;
    // string obx=toObx(state, "-");
    // cout<<obx<<endl;

    // cout <<endl;
    // cout<< "index 0 is "<<indexToCoord(0)<<endl;
    // cout<< "coord A3 is "<<coordToIndex("A3")<<endl;
    // cout<<endl;
    crow::App<crow::CORSHandler> app;

    auto& cors = app.get_middleware<crow::CORSHandler>();
    cors.global()
        .headers("X-Requested-With", "Content-Type", "Access-Control-Allow-Origin", "Access-Control-Allow-Private-Network")
        .methods("GET"_method, "OPTIONS"_method)
        .origin("*");

    CROW_ROUTE(app, "/")
    .methods("GET"_method, "OPTIONS"_method)
    ([](const crow::request& req, crow::response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Private-Network", "true");
        // Tell client we are returning plain text instead of JSON
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
                
                // Construct the OBX string to return
                string responseObx = toObx(state, state.lastMove);

                res.code = 200;
                res.body = "{\"obx\":\""+responseObx+"\"}"; // Pure plain text string response
                cout << "\n========================================" << endl;
                cout << "[REQUEST RECEIVED]" << endl;
                cout << "Decoded OBX: " << decoded_obx << endl;
                cout << state;
                cout << "========================================" << endl;
            } catch (const exception& e) {
                res.code = 400;
                res.body = "Error: Failed to parse OBX string";
            }
        } else {
            res.code = 400;
            res.body = "Error: Missing 'obx' parameter";
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

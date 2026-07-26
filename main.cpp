#include <iostream>
#include <vector>
using namespace std;

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

int main(){
    char board[25];
    for(int i=0;i<25;i++){
        if(i==0||i==4||i==20||i==24){
           board[i]='T'; 
        } else {
            board[i]='X';
        }
    }
    printBoard(board);
    validMoves(5);
    board[1]='G';
    validCaptures(board,0);
    return 0;
}

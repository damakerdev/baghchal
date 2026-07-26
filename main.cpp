#include <iostream>
using namespace std;

void printBoard(char b[]);
bool hasDiagonals(int row, int col);
void validMoves(int move);
void validCaptures(char b[],int tigerIdx);

//up,down.left right
int dr[]={-1,1,0,0};
int dc[]={0,0,1,-1};

//upleft,upright,downleft,downright
int diag_dr[]={-1,-1,1,1};
int diag_dc[]={-1,1,-1,1};

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
    return 0;
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
    for(int j=0;j<4;j++){
        int nr=r+dr[j];
        int nc=c+dc[j];
        if(nr>= 0&&nr <5&&nc>=0&&nc < 5){
            nidx=(nr*5)+nc;
            cout<<nidx<<"\n";
        }
    }
    if(hasDiagonals(r,c)){
        for(int j=0;j<4;j++){
            int nr=r+diag_dr[j];
            int nc=c+diag_dc[j];
            if(nr>= 0&&nr <5&&nc>=0&&nc < 5){
                nidx=(nr*5)+nc;
                cout<<nidx<<"\n";
            }
        }
    }
}

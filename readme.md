# baghchal engine | BLACKBIRD 🐦‍⬛ 
### goal: stockfish for baghchal [WIP]

a c++ implementation of Baghchal.
soon to be a full blown game engine with baghchal bots. :D

### Web UI

a basic web implementation of Baghchal so that users can play with `baghchal engine` bot. I have used the [Baghchal.JS](https://github.com/bhu1st/baghchal.js) library to make this web game. 

[Click here to play Baghchal with our bot](https://damakerdev.github.io/baghchal/web/index.html)
*you need to run the `main.cpp` somewhere and put the link to the server in the Set API field to be able to play with the bot*

### Local Development & Deployment

#### METHOD 1: Using Docker (recommended)

#### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

#### Steps
1. Clone the repository:
```bash
   git clone https://github.com/damakerdev/baghchal.git
   cd baghchal
```

2. Build the Docker image:

```bash
    docker build -t baghchal-engine .
```

3. Run the container:

```bash
docker run -it -p 8080:8080 baghchal-engine
```

#### METHOD 2: Native compilation. manually..

If you prefer building directly on your host machine:

### Prerequisites
- G++ compiler supporting C++17 or higher
- Asio C++ Library (libasio-dev)
- Crow C++ Framework header files

#### Build & Run
1. Install these dependencies:
g++,cmake, libasio-dev, git

2. Install crow header files:
```bash
git clone https://github.com/CrowCpp/Crow.git /tmp/crow
sudo cp -r /tmp/crow/include/* /usr/local/include/
```

3. Compile the source files:

```bash
g++ -O2 src/*.cpp -o baghchal_server -pthread -I/usr/local/include
```

4. Start the server:

```bash
./baghchal_server
```

Server will initialize on http://localhost:8080.


The API server will be live and ready at http://localhost:8080. Then, you can change the API url in the website through the input field below the NEW GAME button. 

Happy coding! 
# baghchal engine | BLACKBIRD 🐦‍⬛ 
### goal: stockfish for baghchal [WIP]

a c++ implementation of Baghchal.
soon to be a full blown game engine with baghchal bots. :D

### Web UI

a basic web implementation of Baghchal so that users can play with `baghchal engine` bot. I have used the [Baghchal.JS](https://github.com/bhu1st/baghchal.js) library to make this web game. 

[Click here to play Baghchal with our bot](https://damakerdev.github.io/baghchal/web/index.html)
*you need to run the `main.cpp` somewhere and put the link to the server in the Set API field to be able to play with the bot*

### Local Development & Deployment
(using docker)

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

The API server will be live and ready at http://localhost:8080. Then, you can change the API url in the website through the input field below the NEW GAME button. 

Happy coding! 
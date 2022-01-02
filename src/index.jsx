import "./index.css";
import {
  pipe,
  map,
  divide,
  __,
  zipWith,
  sortBy,
  xprod,
  range,
  contains,
  head,
  tail,
  not,
  curry,
  isNil,
  always,
  ifElse,
  either,
  equals,
  sum,
  subtract,
  apply,
  flip,
  evolve,
  add,
  inc,
  length,
  find,
  complement,
  append,
  dropRepeatsWith,
  identity,
  pick,
  merge,
  toUpper,
  max,
  assoc,
  take,
  prepend,
  when,
  prop,
  unless,
  pathOr,
  last,
  both,
  propOr,
} from "ramda";
import ReactDOM from "react-dom";

/* 


helpers


*/

const magnitude = pipe(
  map((x) => x * x),
  sum,
  Math.sqrt
);
const truncate = pipe(Math.trunc, (x) => x | 0);
const normalize = (v) => map(divide(__, magnitude(v)), v);
const directionVectorBetween = pipe(
  zipWith(subtract),
  normalize,
  map(truncate)
);
const distance = pipe(zipWith(subtract), magnitude);
const radiansToDegrees = (radians) => (radians * 180) / Math.PI;
const vectorToRadians = apply(flip(Math.atan2));
const shuffle = sortBy(Math.random);

/*


Data


*/

const growthFactor = 2,
  amountOfColumns = 17,
  amountOfRows = 15;

const board = xprod(range(0, amountOfColumns), range(0, amountOfRows));

const [i, j] = [4, Math.floor(amountOfRows / 2)];

const initialSnake = [
  [i, j],
  [i - 1, j],
  [i - 2, j],
];

const initialState = {
  _state: "IDLE",
  apple: [amountOfColumns - i, j],
  snake: initialSnake,
  directionQueue: ["EAST"],
  size: length(initialSnake) + 1,
  score: 0,
  highScore: 0,
};

/*


Transition


*/

const isSnakeEatingTail = ({ snake }) => contains(head(snake), tail(snake));

const isSnakeOutOfBounds = ({ snake }) => not(contains(head(snake), board));

const increaseSize = evolve({ size: add(growthFactor) });

const incrementScore = evolve({ score: inc });

const updateHighscore = (state) =>
  evolve({ highScore: max(state.score) }, state);

const updateScore = pipe(incrementScore, updateHighscore);

const isSnakeEatingApple = ({ apple, snake }) => equals(apple, head(snake));

const respawnApple = (state) =>
  assoc(
    "apple",
    find(complement(contains(__, state.snake)), shuffle(board)),
    state
  );

const directionToVector = prop(__, {
  NORTH: [0, -1],
  SOUTH: [0, 1],
  WEST: [-1, 0],
  EAST: [1, 0],
});

const toNextSnakeHead = ({ directionQueue, snake }) =>
  zipWith(add, directionToVector(head(directionQueue)), head(snake));

const moveSnake = (state) =>
  evolve(
    { snake: pipe(prepend(toNextSnakeHead(state)), take(state.size)) },
    state
  );

const endGame = assoc("_state", "GAMEOVER");

const dequeueDirection = evolve({
  directionQueue: unless(pipe(length, equals(1)), tail),
});

const isGameOver = either(isSnakeEatingTail, isSnakeOutOfBounds);

const step = pipe(
  dequeueDirection,
  moveSnake,
  when(isSnakeEatingApple, pipe(respawnApple, increaseSize, updateScore)),
  when(either(isSnakeEatingTail, isSnakeOutOfBounds), endGame)
);

const toOppositeDirection = prop(__, {
  NORTH: "SOUTH",
  SOUTH: "NORTH",
  EAST: "WEST",
  WEST: "EAST",
});

const isOppositeDirections = (direction1, direction2) =>
  equals(toOppositeDirection(direction1), direction2);

const enqueueDirection = (state, nextDirection) =>
  evolve(
    {
      directionQueue: pipe(
        append(nextDirection),
        dropRepeatsWith(either(equals, isOppositeDirections)),
        take(3)
      ),
    },
    state
  );

const playGame = pipe(enqueueDirection, assoc("_state", "PLAY"));

const restartGame = pipe(pick(["highScore"]), merge(initialState));

const transition = (state, action) =>
  pathOr(identity, [state._state, action.type], {
    IDLE: {
      TURN: playGame,
    },
    GAMEOVER: {
      RESTART: restartGame,
    },
    PLAY: {
      TURN: enqueueDirection,
      STEP: step,
    },
  })(state, action.value);

/*


View


*/

const imageURLs = {
  apple: "https://www.google.com/logos/fnbx/snake_arcade/apple.png",
  trophy: "https://www.google.com/logos/fnbx/snake_arcade/trophy.png",
};

const SnakeEye = (props) => (
  <g {...props}>
    <circle className="light-blue" cx="0" cy="0" r="1" />
    <circle className="white" cx="0" cy="0" r="0.75" />
    <circle className="dark-blue" cx="0.4" cy="0" r="0.35" />
  </g>
);

const Triangle = (props) => <polygon {...props} points="0,0 1,0.5 0,1" />;

const SemiCircle = (props) => <path {...props} d="M-1,0 a1,1 0 0,0 2,0" />;

const isSnakeMovingTowardsApple = ({ directionQueue, snakePositions, apple }) =>
  equals(
    directionToVector(head(directionQueue)),
    directionVectorBetween(apple, head(snakePositions))
  );

const furthestDistanceSnakeOpensMouth = 4;
const isSnakeCloseToApple = ({ snakePositions, apple }) =>
  distance(head(snakePositions), apple) <= furthestDistanceSnakeOpensMouth;

const toSnakeMouthClassName = ifElse(
  both(isSnakeMovingTowardsApple, isSnakeCloseToApple),
  always("show"),
  always("hide")
);

const SnakeMouth = (props) => (
  <g {...props} className={toSnakeMouthClassName(props)}>
    <g transform="rotate(-90)">
      <SemiCircle className="light-blue" />
      <SemiCircle
        className="dark-blue"
        transform="scale(0.75) translate(0 0.2)"
      />
    </g>
    <g className="white" transform="scale(0.3) translate(0.5)">
      <Triangle transform="translate(0 0.9)" />
      <Triangle transform="translate(0 -1.8)" />
    </g>
  </g>
);

const directionToDegrees = pipe(
  directionToVector,
  vectorToRadians,
  radiansToDegrees
);

const toSnakeHeadTransform = ({ snakePositions, direction }) =>
  `translate(${head(snakePositions)}) 
   rotate(${directionToDegrees(direction)}) 
   scale(0.85) 
   translate(-0.2)`;

const SnakeHead = (props) => (
  <g transform={toSnakeHeadTransform(props)}>
    <circle cx="0.6" cy="0" r="0.53" className="light-blue" />
    <g className="dark-blue">
      <circle cx="0.7" cy="-0.25" r="0.07" />
      <circle cx="0.7" cy="0.25" r="0.07" />
    </g>
    <g transform="scale(0.3)">
      <SnakeEye transform="translate(0 -1.3)" />
      <SnakeEye transform="translate(0 1.3)" />
    </g>
    <SnakeMouth {...props} transform="translate(0.4) scale(0.7)" />
  </g>
);

const SnakeBody = (props) => (
  <polyline className="snake-body" points={props.snakePositions} />
);

const Snake = (props) => (
  <g transform="translate(0.5 0.5)">
    <SnakeBody {...props} />
    <SnakeHead {...props} />
  </g>
);

const toModalClassName = (state) =>
  `modal ${ifElse(isGameOver, always("fade-in"), always("hide"))(state)}`;

const Modal = (state) => (
  <div className={toModalClassName(state)}>
    <button onClick={pipe(makeRestart, input)} className="button">
      ↻ Play Again?
    </button>
  </div>
);

const toAppleClassName = ({ _state }) =>
  `apple ${propOr("", _state, { PLAY: "animate-apple" })}`;

const Apple = ({ apple: [i, j], _state }) => (
  <svg x={i - 1} y={j - 1} width="3" height="3" viewBox="-3 -3 6 6">
    <image
      className={toAppleClassName({ _state })}
      href={imageURLs.apple}
      x="-1"
      y="-1"
      width="2"
      height="2"
    />
  </svg>
);

const Background = () => (
  <g className="background">
    <pattern
      id="checkers"
      x="0"
      y="0"
      width="2"
      height="2"
      patternUnits="userSpaceOnUse"
    >
      <rect className="light-checker" x="0" width="1" height="1" y="0" />
      <rect className="light-checker" x="1" width="1" height="1" y="1" />
    </pattern>
    <rect className="dark-checker" x="0" y="0" width="100%" height="100%" />
    <rect x="0" y="0" width="100%" height="100%" fill="url(#checkers)" />
  </g>
);

const GameBoard = (props) => (
  <svg
    className="game-board"
    viewBox={`0 0 ${amountOfColumns} ${amountOfRows}`}
  >
    <Background />
    <Apple {...props} />
    <Snake {...props} />
  </svg>
);

const ScoreBoard = ({ score, highScore }) => (
  <div className="score-board">
    <img alt="apple" src={imageURLs.apple} />
    <div className="score">{score}</div>
    <img alt="highscore" src={imageURLs.trophy} />
    <div className="score">{highScore}</div>
  </div>
);

const Game = (props) => (
  <div className="game">
    <ScoreBoard {...props} />
    <div className="board-container">
      <Modal {...props} />
      <GameBoard {...props} />
    </div>
  </div>
);

const lerp = curry(
  (percentage, x1, x2) => (1 - percentage) * x1 + percentage * x2
);

const lerpVector = (percentage, v1, v2) => zipWith(lerp(percentage), v1, v2);

const toSnakePositions = (elapsedTime, previousSnake, snake) => [
  lerpVector(elapsedTime / timeStep, head(previousSnake), head(snake)),
  ...tail(snake),
  lerpVector(elapsedTime / timeStep, last(previousSnake), last(snake)),
];

const toGameProps = (elapsedTime, previousState, state) =>
  merge(state, {
    direction: head(state.directionQueue),
    snakePositions: toSnakePositions(
      elapsedTime,
      previousState.snake,
      state.snake
    ),
  });

/*


Actions Creators


*/

const makeRestart = () => ({
  type: "RESTART",
});

const makeStep = () => ({
  type: "STEP",
});

const keyToDirection = prop(__, {
  KEYW: "NORTH",
  KEYS: "SOUTH",
  KEYA: "WEST",
  KEYD: "EAST",
  ARROWUP: "NORTH",
  ARROWDOWN: "SOUTH",
  ARROWLEFT: "WEST",
  ARROWRIGHT: "EAST",
});

const keyEventToKey = pipe(prop("code"), toUpper);

const keyEventToDirection = pipe(keyEventToKey, keyToDirection);

const makeTurn = (direction) => ({
  type: "TURN",
  value: direction,
});

/*


Input and Output


*/

/* state of the program */
let previousState = initialState;
let state = previousState;

const input = (action) => {
  /* middleware */
  if (action.type === "STEP") {
    previousState = state;
  }

  state = transition(state, action);

  if (action.type === "RESTART") {
    previousState = state;
  }
};

const output = (elapsedTime) => {
  const props = toGameProps(elapsedTime, previousState, state);
  const root = document.getElementById("root");
  ReactDOM.render(<Game {...props} />, root);
};

/*

Keyboard

*/
const handleKeyDownEvent = pipe(
  keyEventToDirection,
  unless(isNil, pipe(makeTurn, input))
);
document.addEventListener("keydown", handleKeyDownEvent);

/*

Time

*/
const timeStep = 1 / 6;
const gameLoop = curry((timeElapsed, currentTime) => {
  for (; timeElapsed > timeStep; timeElapsed -= timeStep) {
    input(makeStep());
  }
  output(timeElapsed);
  window.requestAnimationFrame((nextTime) => {
    gameLoop(timeElapsed + (nextTime - currentTime) / 1000, nextTime);
  });
});

window.requestAnimationFrame(gameLoop(0));

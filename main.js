// Entry point — bootstraps the game. All the real logic lives in ./src/.
import { Game } from './src/Game.js';

const game = new Game(document.body);
game.start();

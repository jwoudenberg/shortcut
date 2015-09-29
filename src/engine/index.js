import flyd from 'flyd';
import { values } from 'ramda';
import { fromJS } from 'immutable';
import { create as createTurnBasedGame } from './turn-based-game-engine';
import { create as createGameMaster } from './game-master';
import * as rules from './rules';

export function createGame (moves) {
    const immutableMoves = moves.map(fromJS);
    const { makeMove, getWorldState, onMove } = createTurnBasedGame(values(rules));
    const errors = applyMoves(makeMove, immutableMoves);
    const acceptedMoves = getAcceptedMoves(onMove);
    const world = getWorld(getWorldState, acceptedMoves);
    flyd.on(immutableMoves, createGameMaster(acceptedMoves));
    return {
        errors,
        world,
        moves: acceptedMoves.map(move => move.set('hash', move.hashCode()).toJS())
    };
}

function getAcceptedMoves (onMove) {
    const acceptedMoves = flyd.stream();
    onMove(acceptedMoves);
    return acceptedMoves;
}

function applyMoves (makeMove, moves) {
    const errors = flyd.stream([moves], _errors => {
        const { error } = makeMove(moves());
        if (error) {
            _errors(error);
        }
    });
    return errors;
}

function getWorld (getWorldState, moves) {
    let previousWorldState = null;
    const world = flyd.stream([moves], _world => {
        const worldState = getWorldState(moves().hashCode());
        const immutableWorldState = fromJS(worldState);
        if (immutableWorldState && !immutableWorldState.equals(previousWorldState)) {
            previousWorldState = immutableWorldState;
            _world(worldState);
        }
    });
    return world;
}

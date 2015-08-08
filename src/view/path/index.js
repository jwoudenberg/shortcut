const React = require('react');
const R = require('ramda');
const flyd = require('flyd');
const PATH_SVG_DATA = require('./pathSVGData');
const PATH_DISTANCE_TO_SHAPE_MAP = {
    '-4': { type: 's_turn' },
    '-3': { type: 'straight' },
    '-2': { type: 'l_turn', transforms: [{ rotate: 90 }] },
    '-1': { type: 'sharp_turn' },
    '0': { type: 'dead_end' },
    '1': { type: 'u_turn' },
    '2': { type: 'l_turn' },
    '3': { type: 'wide_turn' },
    '4': { type: 's_turn' }
};
const LONG_HOVER_TIME_MS = 100;
import { uiEvents } from '../base';
import './style.css';

const mouseEnterEvents = flyd.stream();
const mouseLeaveEvents = flyd.stream();
const mousedOverPath = flyd.immediate(flyd.stream([mouseEnterEvents, mouseLeaveEvents], (self, changed) => {
    let mouseLeaveUpdated = R.contains(mouseLeaveEvents, changed);
    let leftCurrentPath = mouseLeaveUpdated && R.equals(self(), mouseLeaveEvents());
    self(leftCurrentPath ? null : mouseEnterEvents());
}));
const longHoverOverPath = (function createLongHoverStream() {
    let timer = null;
    return flyd.stream([mousedOverPath], (self) => {
        clearTimeout(timer);
        timer = setTimeout(
            () => mousedOverPath() && self( mousedOverPath()),
            LONG_HOVER_TIME_MS
        );
    });
}());
//TODO: replace uiEvents with a stream of streams, so we don't need to take the side effect route here.
flyd.on((pathId) => uiEvents({ pathId, type: 'show_route' }), longHoverOverPath);

class Path extends React.Component {
    handleMouseOver(event) {
        let eventStream = (event.type === 'mouseenter') ? mouseEnterEvents : mouseLeaveEvents;
        eventStream(this.props.id);
    }
    _getEvenPathShape(start, distance) {
        let addDefaults = R.merge({
            type: null,
            rotation: 0,
            transforms: []
        });
        let shape = addDefaults(PATH_DISTANCE_TO_SHAPE_MAP[distance]);
        return shape;
    }
    _getOddPathShape(start, distance) {
        //Odd ports (1,3,5,7) will use mirror images of even ports (0,2,4,6)
        distance = -distance;
        let shape = R.pipe(
            this._getEvenPathShape.bind(this),
            R.evolve({ transforms: R.append({ mirror: true })})
        )(start, distance);
        return shape;
    }
    _getPathShape(port1, port2) {
        //If only one port is given, set the second one to equal the first.
        port2 = R.defaultTo(port1, port2);

        let maybeShorterDistance = n => (n <= 4) ? n : (n - 8);
        let distance = R.pipe(
            R.subtract,
            Math.abs,
            maybeShorterDistance
        )(port1, port2);

        let start = Math.min(port1, port2);

        let even = n => !(n % 2);
        let getShape = R.ifElse(even, this._getEvenPathShape.bind(this), this._getOddPathShape.bind(this));
        let rotation = R.mathMod(-Math.floor(start / 2) * 90, 360);
        let rotate = R.evolve({ transforms: R.append({ rotate: rotation })});
        let shape = R.pipe(getShape, rotate)(start, distance);
        return shape;
    }
    _getTransformString(transform) {
        let [type, amount] = R.toPairs(transform)[0];
        let transformString = R.cond([
            [R.identical('rotate'), (type, rotation) => `rotate(${rotation} 375 375)`],
            [R.identical('mirror'), () => 'scale(-1 1) translate(-750, 0)'],
            [R.T, (type) => { throw new Error('Unknown transform type ' + type); }]
        ])(type, amount);
        return transformString;
    }
    render() {
        let { ports, color } = this.props;
        let { type, transforms } = this._getPathShape(...ports);
        //TODO: Replace json data for path type with component per path type.
        let svgPaths = PATH_SVG_DATA[type];
        let transformAttr = transforms.reverse().map(this._getTransformString).join(' ');
        let style = {
            stroke: color,
            fill: color
        };
        return <div className="shortcut-path shortcut-box" style={{ pointerEvents: 'none' }}>
            <svg version="1.1" viewBox="0 0 750 750">
                <g
                    className="shortcut-path-container"
                    transform={transformAttr}
                    onMouseEnter={this.handleMouseOver.bind(this)}
                    onMouseLeave={this.handleMouseOver.bind(this)}
                    style={{ pointerEvents: 'all' }}
                >
                    {svgPaths.map(function drawSVGPath(svgPath) {
                        return <path key={svgPath.d} style={style} {...svgPath} />;
                    })}
                </g>
            </svg>
        </div>;
    }
}

module.exports = Path;
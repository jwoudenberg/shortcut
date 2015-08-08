import React from 'react';
import flyd from 'flyd';
import './style.css';

export const uiEvents = flyd.stream();

/* An abstract Box class from which Card and Field inherit. */
export class Box extends React.Component {
    getStyle() {
        const { fieldSize, row, col } = this.props;
        const style = {
            left: (fieldSize - 1) * col,
            top: (fieldSize - 1) * row,
            width: fieldSize,
            height: fieldSize
        };
        return style;
    }
}
/// <reference path="../scripts/typings/node/node.d.ts" />
/// <reference path="../scripts/typings/requirejs/require.d.ts" />
'use strict';
function getEquallySpacedData(x, y, options) {
    var xLength = x.length;
    if (xLength !== y.length)
        throw new RangeError("the x and y vector doesn't have the same size.");
    if (options === undefined) {
        options = {};
    }
    //var from = options.from === undefined ? x[0] : options.from;
    var from;
    if (options.from === undefined) {
        from = x[0];
    }
    else {
        from = options.from;
    }
    if (isNaN(from) || !isFinite(from)) {
        throw new RangeError("'From' value must be a number");
    }
    var to = options.to === undefined ? x[x.length - 1] : options.to;
    if (isNaN(to) || !isFinite(to)) {
        throw new RangeError("'To' value must be a number");
    }
    var reverse = from > to;
    if (reverse) {
        var temp = from;
        from = to;
        to = temp;
    }
    var numberOfPoints = options.numberOfPoints === undefined ? 100 : options.numberOfPoints;
    if (isNaN(numberOfPoints) || !isFinite(numberOfPoints)) {
        throw new RangeError("'Number of points' value must be a number");
    }
    if (numberOfPoints < 1)
        throw new RangeError("the number of point must be higher than 1");
    //var algorithm = options.variant === "slot" ? "slot" : "smooth"; // default value: smooth
    var algorithm;
    if (options.variant === "slot") {
        algorithm = "slot";
    }
    else if (options.variant === "unit") {
        algorithm = "unit";
    }
    else {
        algorithm = "smooth";
    }
    //var output = algorithm === "slot" ? getEquallySpacedSlot(x, y, from, to, numberOfPoints) : getEquallySpacedSmooth(x, y, from, to, numberOfPoints);
    var output;
    if (algorithm === "slot") {
        output = getEquallySpacedSlot(x, y, from, to, numberOfPoints);
    }
    else if (algorithm === "unit") {
        output = getUnitVector(x, y, from, to, numberOfPoints);
    }
    else {
        output = getEquallySpacedSmooth(x, y, from, to, numberOfPoints);
    }
    return reverse ? output.reverse() : output;
}
exports.getEquallySpacedData = getEquallySpacedData;
/**
 * function that retrieves the getEquallySpacedData with the variant "smooth"
 *
 * @param x
 * @param y
 * @param from - Initial point
 * @param to - Final point
 * @param numberOfPoints
 * @returns {Array} - Array of y's equally spaced with the variant "smooth"
 */
function getEquallySpacedSmooth(x, y, from, to, numberOfPoints) {
    var xLength = x.length;
    var step = (to - from) / (numberOfPoints - 1);
    var halfStep = step / 2;
    var start = from - halfStep;
    var output = new Array(numberOfPoints);
    var initialOriginalStep = x[1] - x[0];
    var lastOriginalStep = x[x.length - 1] - x[x.length - 2];
    // Init main variables
    var min = start;
    var max = start + step;
    var previousX = -Number.MAX_VALUE;
    var previousY = 0;
    var nextX = x[0] - initialOriginalStep;
    var nextY = 0;
    var currentValue = 0;
    var slope = 0;
    var intercept = 0;
    var sumAtMin = 0;
    //var sumAtMax = 0;
    var sumAtMax;
    //sumAtMax = 0;
    var i = 0; // index of input
    var j = 0; // index of output
    function getSlope(x0, y0, x1, y1) {
        return (y1 - y0) / (x1 - x0);
    }
    main: while (true) {
        while (nextX - max >= 0) {
            // no overlap with original point, just consume current value
            var add = integral(0, max - previousX, slope, previousY);
            sumAtMax = currentValue + add;
            output[j] = (sumAtMax - sumAtMin) / step;
            j++;
            if (j === numberOfPoints)
                break main;
            min = max;
            max += step;
            sumAtMin = sumAtMax;
        }
        if (previousX <= min && min <= nextX) {
            add = integral(0, min - previousX, slope, previousY);
            sumAtMin = currentValue + add;
        }
        currentValue += integral(previousX, nextX, slope, intercept);
        previousX = nextX;
        previousY = nextY;
        if (i < xLength) {
            nextX = x[i];
            nextY = y[i];
            i++;
        }
        else if (i === xLength) {
            nextX += lastOriginalStep;
            nextY = 0;
        }
        // updating parameters
        slope = getSlope(previousX, previousY, nextX, nextY);
        intercept = -slope * previousX + previousY;
    }
    return output;
}
/**
 * function that retrieves the getEquallySpacedData with the variant "slot"
 *
 * @param x
 * @param y
 * @param from - Initial point
 * @param to - Final point
 * @param numberOfPoints
 * @returns {Array} - Array of y's equally spaced with the variant "slot"
 */
function getEquallySpacedSlot(x, y, from, to, numberOfPoints) {
    var xLength = x.length;
    var step = (to - from) / (numberOfPoints - 1);
    var halfStep = step / 2;
    var lastStep = x[x.length - 1] - x[x.length - 2];
    var start = from - halfStep;
    var output = new Array(numberOfPoints);
    // Init main variables
    var min = start;
    var max = start + step;
    var previousX = -Number.MAX_VALUE;
    var previousY = 0;
    var nextX = x[0];
    var nextY = y[0];
    var frontOutsideSpectra = 0;
    var backOutsideSpectra = true;
    var currentValue = 0;
    // for slot algorithm
    var currentPoints = 0;
    var i = 1; // index of input
    var j = 0; // index of output
    main: while (true) {
        while (previousX - max > 0) {
            // no overlap with original point, just consume current value
            if (backOutsideSpectra) {
                currentPoints++;
                backOutsideSpectra = false;
            }
            output[j] = currentPoints <= 0 ? 0 : currentValue / currentPoints;
            j++;
            if (j === numberOfPoints)
                break main;
            min = max;
            max += step;
            currentValue = 0;
            currentPoints = 0;
        }
        if (previousX > min) {
            currentValue += previousY;
            currentPoints++;
        }
        if (previousX === -Number.MAX_VALUE || frontOutsideSpectra > 1)
            currentPoints--;
        previousX = nextX;
        previousY = nextY;
        if (i < xLength) {
            nextX = x[i];
            nextY = y[i];
            i++;
        }
        else {
            nextX += lastStep;
            nextY = 0;
            frontOutsideSpectra++;
        }
    }
    return output;
}
/**
 * function that retrieves the getEquallySpacedData with the variant "slot"
 *
 * @param x
 * @param y
 * @param from - Initial point
 * @param to - Final point
 * @param numberOfPoints
 * @returns {Array} - Array of y's equally spaced with the variant "slot"
 */
function getUnitVector(x, y, from, to, numberOfPoints) {
    var xLength = x.length;
    var step = (to - from) / (numberOfPoints - 1);
    var halfStep = step / 2;
    var lastStep = x[x.length - 1] - x[x.length - 2];
    var start = from - halfStep;
    var output = new Array(numberOfPoints);
    // Init main variables
    var min = start;
    var max = start + step;
    var previousX = -Number.MAX_VALUE;
    var previousY = 0;
    var nextX = x[0];
    var nextY = y[0];
    var frontOutsideSpectra = 0;
    var backOutsideSpectra = true;
    var currentValue = 0;
    // for slot algorithm
    var currentPoints = 0;
    var i = 1; // index of input
    var j = 0; // index of output
    main: while (true) {
        while (previousX - max > 0) {
            // no overlap with original point, just consume current value
            if (backOutsideSpectra) {
                currentPoints++;
                backOutsideSpectra = false;
            }

            if (currentPoints <= 0) {
                    output[j] = 0;
            }

            else {
                output[j] = currentValue;
            }
            j++;

            if (j === numberOfPoints)
                break main;
            min = max;
            max += step;
            currentValue = 0;
            currentPoints = 0;
        }
        if (previousX > min) {
            currentValue += previousY;
            currentPoints++;
        }
        if (previousX === -Number.MAX_VALUE || frontOutsideSpectra > 1)
            currentPoints--;
        previousX = nextX;
        previousY = nextY;
        if (i < xLength) {
            nextX = x[i];
            nextY = y[i];
            i++;
        }
        else {
            nextX += lastStep;
            nextY = 0;
            frontOutsideSpectra++;
        }
    }
    return output;
}
/**
 * Function that calculates the integral of the line between two
 * x-coordinates, given the slope and intercept of the line.
 *
 * @param x0
 * @param x1
 * @param slope
 * @param intercept
 * @returns {number} integral value.
 */
function integral(x0, x1, slope, intercept) {
    return (0.5 * slope * x1 * x1 + intercept * x1) - (0.5 * slope * x0 * x0 + intercept * x0);
}
exports.integral = integral;

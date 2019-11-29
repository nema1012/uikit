import {css} from './style';
import {Promise} from './promise';
import {isVisible} from './filter';
import {parents} from './selector';
import {offset, offsetPosition, position} from './dimensions';
import {clamp, intersectRect, isDocument, isWindow, last, pointInRect, toNode} from './lang';

export function isInView(element, offsetTop = 0, offsetLeft = 0) {

    if (!isVisible(element)) {
        return false;
    }

    const parents = scrollParents(element, /auto|scroll|hidden/).concat(toNode(element));

    for (let i = 0; i < parents.length - 1; i++) {
        const {top, left, bottom, right} = offset(getViewport(parents[i]));
        const vp = {
            top: top - offsetTop,
            left: left - offsetLeft,
            bottom: bottom + offsetTop,
            right: right + offsetLeft
        };

        const client = offset(parents[i + 1]);

        if (!intersectRect(client, vp) && !pointInRect({x: client.left, y: client.top}, vp)) {
            return false;
        }
    }

    return true;
}

export function scrollTop(element, top) {
    element = toNode(element);

    if (isWindow(element) || isDocument(element)) {
        element = getScrollingElement();
    }

    element.scrollTo(0, top);
}

export function scrollIntoView(element, {duration = 1000, offset = 0} = {}) {

    if (!isVisible(element)) {
        return;
    }

    const parents = scrollParents(element, /auto|scroll|hidden/).concat(toNode(element));
    duration /= parents.length - 1;

    let promise = Promise.resolve();
    for (let i = 0; i < parents.length - 1; i++) {
        promise = promise.then(() =>
            new Promise(resolve => {

                const scrollElement = parents[i];
                const element = parents[i + 1];

                const {scrollTop} = scrollElement;
                const top = position(element, getViewport(scrollElement)).top - offset;

                const start = Date.now();
                const step = () => {

                    const percent = ease(clamp((Date.now() - start) / duration));

                    scrollElement.scrollTo(0, scrollTop + top * percent);

                    // scroll more if we have not reached our destination
                    if (percent !== 1) {
                        requestAnimationFrame(step);
                    } else {
                        resolve();
                    }

                };

                step();
            })
        );
    }

    return promise;

    function ease(k) {
        return 0.5 * (1 - Math.cos(Math.PI * k));
    }

}

export function scrolledOver(element, heightOffset = 0) {

    if (!isVisible(element)) {
        return 0;
    }

    element = toNode(element);

    const scrollElement = scrollParent(element);
    const {scrollHeight, scrollTop} = scrollElement;
    const viewport = getViewport(scrollElement);
    const viewportHeight = offset(viewport).height;
    const viewportTop = offsetPosition(element)[0] - scrollTop - offsetPosition(scrollElement)[0];
    const viewportDist = Math.min(viewportHeight, viewportTop + scrollTop);

    const top = viewportTop - viewportDist;
    const dist = Math.min(
        offset(element).height + heightOffset + viewportDist,
        scrollHeight - (viewportTop + scrollTop),
        scrollHeight - viewportHeight
    );

    return clamp(-1 * top / dist);
}

export function scrollParents(element, overflowRe = /auto|scroll/) {

    element = toNode(element);

    const scrollEl = getScrollingElement();
    return element
        ? parents(element, '*').filter(parent =>
            parent === scrollEl
            || overflowRe.test(css(parent, 'overflow'))
            && parent.scrollHeight > offset(parent).height
        ).reverse()
        : [scrollEl];
}

export function scrollParent(element) {
    return last(scrollParents(element));
}

export function getScrollingElement() {
    return document.scrollingElement || document.documentElement;
}

export function getViewport(scrollElement) {
    return scrollElement === getScrollingElement() ? window : scrollElement;
}

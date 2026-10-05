// Evaluation pipeline (A, B, and Cross)
import { localizeRatio, nearestET, RM, quadrant } from "./et.js";
import { effectsFromDeltaAndQuad } from "./effects.js";

export function evaluateET(item, tonicIndex, params = { c0: 10, Gamma: 10, K: 1 }) {
    const rLocal = localizeRatio(item.r, tonicIndex);
    const et = nearestET(rLocal); // { n, q_et, deltaC_et }
    const rm = RM(item.ω1, item.ω2, et.deltaC_et, params.K, params.Gamma);
    
    return { ...item, rLocal, ...et, rm };
}

export function classifyET(e, theta, c0 = 10) {
    const quad = quadrant(e.deltaC_et, e.rm, c0, theta);
    const fx = effectsFromDeltaAndQuad(e.deltaC_et, quad, e.rm, theta);
    
    return { ...e, quad, fx };
}

export function crossET(A, B, params = { c0: 10, Gamma: 10, K: 1 }, theta) {
    const rX = A.rLocal / B.rLocal;
    const etX = nearestET(rX);
    
    const norm = (x, y) => {
        const s = Math.hypot(x, y) || 1;
        return [x / s, y / s];
    };
    
    const [ai, bi] = norm(A.ω1 || 1, B.ω1 || 1);
    const [aj, bj] = norm(A.ω2 || 1, B.ω2 || 1);
    
    const rmX = RM(Math.hypot(ai, aj), Math.hypot(bi, bj), etX.deltaC_et, params.K, params.Gamma);
    const quadX = quadrant(etX.deltaC_et, rmX, params.c0, theta);
    const fxX = effectsFromDeltaAndQuad(etX.deltaC_et, quadX, rmX, theta);
    
    return { rX, ...etX, rmX, quadX, fxX };
}
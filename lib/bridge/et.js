// ET quantization & evaluation utils
export function localizeRatio(r, tonicIndex) {
    const rT = Math.pow(2, tonicIndex / 12);
    return r / rT; // rLocal
}

export function nearestET(rLocal) {
    const n = Math.round(12 * Math.log2(rLocal));
    const q_et = Math.pow(2, n / 12);
    const deltaC_et = 1200 * Math.log2(rLocal / q_et); // signed cents
    return { n, q_et, deltaC_et };
}

// RM & quadrant
export function RM(omega1, omega2, deltaC, K = 1, Gamma = 10) {
    return K * (omega1 * omega2) / (deltaC * deltaC + Gamma * Gamma);
}

export function quadrant(deltaC, rm, c0 = 10, theta) {
    const left = Math.abs(deltaC) <= c0;
    const upper = rm >= theta;
    if (left && upper) return "Ⓢ";
    if (!left && upper) return "Ⓒ";
    if (left && !upper) return "Ⓦ";
    return "Ⓐ";
}
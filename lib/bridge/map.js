// Input mappers A/B
export function mapText(name, tonicHz = 220) {
    const map = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    const semis = [...name.toUpperCase()].map(ch => map[ch]).filter(x => x !== undefined);
    
    if (semis.length < 2) return null;
    
    const freqs = semis.map(s => tonicHz * Math.pow(2, s / 12));
    const f1 = freqs.reduce((a, b) => a + b, 0) / freqs.length;
    const f2 = Math.max(...freqs);
    const r = f2 / f1;
    
    return { r, ω1: 2 * Math.PI * f1, ω2: 2 * Math.PI * f2 };
}

export function mapNumber(x) {
    return { r: Math.max(1e-6, x), ω1: 1, ω2: 1 };
}

export function mapDate(d) {
    const year = 365.2422;
    const day0 = new Date(d.getFullYear(), 0, 0).getTime();
    const doy = Math.floor((d.getTime() - day0) / 86400000);
    const month = d.getMonth() + 1;
    const r = (doy / year) / (month / 12);
    
    return { r, ω1: 1, ω2: 1 };
}
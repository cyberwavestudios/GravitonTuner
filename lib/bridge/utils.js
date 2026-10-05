// Utility functions for Bridge mode

// Median helper function
export const median = (xs) => {
    const a = xs.slice().sort((m, n) => m - n);
    const m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};
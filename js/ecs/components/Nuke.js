export const Nuke = (timer = 100) => ({
    type: 'Nuke',
    timer,
    maxTimer: timer,
});

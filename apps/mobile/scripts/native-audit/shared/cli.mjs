export function parseArgs(argv) {
    return {
        flag: name => argv.includes(name),
        option: name => {
            const index = argv.indexOf(name);
            return index !== -1 ? argv[index + 1] : undefined;
        },
        // A flag passed more than once, in the order it was passed.
        options: name =>
            argv.reduce(
                (values, argument, index) =>
                    argument === name && argv[index + 1] !== undefined
                        ? [...values, argv[index + 1]]
                        : values,
                []
            )
    };
}

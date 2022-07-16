module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
        '^.+\\.ts?$': 'ts-jest',
        '^.+\\.jsx?$': 'babel-jest',
    },
    transformIgnorePatterns: ['<rootDir>/node_modules/'],
};

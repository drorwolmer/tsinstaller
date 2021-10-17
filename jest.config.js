/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  testPathIgnorePatterns: ["/node_modules/", "example_project/"],
  preset: "ts-jest",
  restoreMocks: true,
  testEnvironment: "node",
};

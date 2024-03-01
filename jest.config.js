module.exports = {
  transform: {
    "^.+\\.tsx?$": "babel-jest",
  },
  preset: "ts-jest",
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  testPathIgnorePatterns: ["/node_modules/", "lib/"],
};

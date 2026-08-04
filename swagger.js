const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");

const swaggerDocument = YAML.load("./api-docs/openapi.yaml");

module.exports = {
  swaggerUi,
  swaggerDocument
};
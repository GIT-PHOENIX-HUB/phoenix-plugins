const { HttpClient } = require('./httpClient');
const { ToolsResource } = require('./resources/tools');
const { JobsResource } = require('./resources/jobs');
const { CustomersResource } = require('./resources/customers');
const { TechniciansResource } = require('./resources/technicians');
const { EmailsResource } = require('./resources/emails');
const { QuotesResource } = require('./resources/quotes');
const { TeamsResource } = require('./resources/teams');
const { FinanceResource } = require('./resources/finance');
const { CourierResource } = require('./resources/courier');
const { BuilderResource } = require('./resources/builder');
const { CalendarResource } = require('./resources/calendar');

/**
 * High-level helper that mirrors the MCP + Azure Function endpoints exposed by
 * phoenix-builder-space. Keeps method names close to the server routes so
 * consumers can discover capabilities quickly.
 */
class PhoenixClient {
  constructor(options = {}) {
    this.http = options.httpClient || new HttpClient(options);
    this.tools = options.toolsResource || new ToolsResource(this.http);

    this.jobs = new JobsResource(this.http, this.tools);
    this.customers = new CustomersResource(this.http, this.tools);
    this.technicians = new TechniciansResource(this.http);
    this.emails = new EmailsResource(this.http);
    this.quotes = new QuotesResource(this.http);
    this.teams = new TeamsResource(this.http);
    this.finance = new FinanceResource(this.tools);
    this.courier = new CourierResource(this.tools);
    this.builder = new BuilderResource(this.tools);
    this.calendar = new CalendarResource(this.tools);

    this.mcp = {
      health: () => this.http.request({ url: '/health' }),
      listTools: () => this.tools.list(),
      invokeTool: (toolName, params = {}, options = {}) => this.tools.invoke(toolName, params, options),
      getPluginManifest: () => this.tools.getPluginManifest(),
      getProtectedResourceMetadata: () => this.tools.getProtectedResourceMetadata()
    };
  }
}

module.exports = {
  PhoenixClient
};

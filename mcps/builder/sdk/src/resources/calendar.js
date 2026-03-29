class CalendarResource {
  constructor(tools) {
    this.tools = tools;
  }

  getEvents(params) {
    return this._invoke('getCalendarEvents', params);
  }

  _invoke(name, params) {
    if (!this.tools) {
      throw new Error('CalendarResource requires ToolsResource instance');
    }

    return this.tools.invoke(name, params);
  }
}

module.exports = {
  CalendarResource
};

/**
 * @file Utils.gs
 * @description Helper functions for the application.
 */

/**
 * Formats a date to a string.
 * @param {Date} date - The date to format.
 * @returns {string} - Formatted date string.
 */
function formatDate(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
}

/**
 * Returns application properties stored in ScriptProperties.
 * @returns {Object} - App configuration.
 */
function getAppProperties() {
  const props = PropertiesService.getScriptProperties().getProperties();
  
  // Default values if properties are not set
  return {
    logoLight: props.LOGO_LIGHT || '190p1KFkQUoJBomzXW_tA3txZqlMwk94m',
    logoDark: props.LOGO_DARK || '1RE1jgKrh7U2GeiB9knfSQ2HY7hT2vj5Z',
    mainLink: props.MAIN_LINK || 'https://gemini.google.com/gem/1zH8sGav5Oq_t_xu3bHLKZjmv_iV8dACE?usp=sharing'
  };
}

/**
 * Utility to set initial properties (can be run manually once).
 */
function setupProperties() {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperties({
    'LOGO_LIGHT': '190p1KFkQUoJBomzXW_tA3txZqlMwk94m',
    'LOGO_DARK': '1RE1jgKrh7U2GeiB9knfSQ2HY7hT2vj5Z',
    'MAIN_LINK': 'https://gemini.google.com/gem/1zH8sGav5Oq_t_xu3bHLKZjmv_iV8dACE?usp=sharing'
  });
}

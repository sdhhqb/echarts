
/**
 * Export echarts as CommonJS module
 */
module.exports = require('./lib/echarts');

// Import all charts and components
require('./lib/chart/line');
require('./lib/chart/bar');
require('./lib/chart/pie');
require('./lib/chart/scatter');
require('./lib/chart/radar');
require('./lib/chart/map');
require('./lib/chart/graph');


require('./lib/component/grid');
require('./lib/component/legend');
require('./lib/component/tooltip');
require('./lib/component/polar');
require('./lib/component/geo');
require('./lib/component/parallel');

require('./lib/component/title');

require('./lib/component/dataZoom');

require('./lib/component/markPoint');
require('./lib/component/markLine');

require('./lib/component/timeline');
require('./lib/component/toolbox');

require('zrender/lib/vml/vml');
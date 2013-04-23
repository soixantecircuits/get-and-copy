var util     = require('util'),
    _        = require('underscore'),
    spawn    = require('child_process').spawn,
    readdirp = require('readdirp'),
    path     = require('path'),
    es       = require('event-stream');

var conf_screen = require('./screens.json'),
var conf = require('./conf.json');

var site = conf.site,
  extension = '.mp3,.mpg,.mpeg,.avi,.mov,.mp4,.html',
  movie    = '',
  user     = conf.user,
  robot_state = 'off',
  agent = 'getandcopy/0.1',
  //The A option that should allow to avoid downloading messy thinfs does not work
  //wget      = spawn('wget', ['-A', extension, '-nd', '-np', '-r', '-l', '3' ,'-N', '-e', "robots="+robot_state, site]);
  //You can remove the -nd option if you want to keep the folder sctructure (it will not influe on the rest of the script)
  wget = spawn('wget', ['-nd', '-np', '-r', '-N', '-e', "robots=" + robot_state, '--no-cookies', '--page-requisites', '--user-agent=' + agent, site]);

wget.stdout.on('data', function(data) {
  process.stdout.write('stdout: ' + data);
});

wget.stderr.on('data', function(data) {
  process.stdout.write("Downloading " + data + "\r");
  //process.stdout.write('stderr: ' + data);
});

wget.on('exit', function(code) {

  var stream = readdirp({
    root: path.join(__dirname),
    fileFilter: '*.mov'
  });
  stream.on('warn', function(err) {
    console.error('non-fatal error', err);
    // optionally call stream.destroy() here in order to abort and cause 'close' to be emitted
  })
    .on('error', function(err) {
    console.error('fatal error', err);
  })
    .pipe(es.mapSync(function(entry) {
    movie = entry;
    _.each(conf_screen.screens, function(el, key) {
      if (el.name === movie.path) {
        console.log("Processing : " + el.name + " to " + el.dest);
        //cp = spawn('cp', [movie.path, el.dest]);
        var scp = spawn('scp', [movie.path, user+"@"+el.dest]);

        scp.stdout.on('data', function(data) {
          process.stdout.write('stdout: ' + data);
        });
        scp.stderr.on('data', function(data) {
          process.stdout.write('stderr: ' + data);
        });

        scp.on('exit', function(code) {
          console.log('child process exited with code ' + code);
        });
      }
    });
    return {
      path: entry.path,
      size: entry.stat.size
    };
  }))
    .pipe(es.stringify())
    .pipe(process.stdout);

});
var soda = require('soda')
,   assert = require('assert')
,   nano = require('nano');

var browser = soda.createSauceClient({
  'url': 'http://saucelabs.com/'
, 'username': 'pouchdb'
, 'access-key': '97de9ee0-2712-49f0-9b17-4b9751d79073'
, 'os': 'Mac 10.6'
, 'browser': 'googlechrome'
, 'browser-version': ''
, 'name': 'Pouch-Chrome/Win2003'
});

browser.on('command', function(cmd, args){
  console.log(' \x1b[33m%s\x1b[0m: %s', cmd, args.join(', '));
});

var url = 'http://127.0.0.1:8000/tests/test.html';
if(process.argv[2]) {
    git_hash = process.argv[2];
    url += '#' + git_hash;
}


browser
  .chain
  .session()
  .open(url)
  .setTimeout(800000)
  .waitForTextPresent('Tests completed in')
  .end(function(err){
    this.queue = null;
    var sauce = {
        jobUrl : this.jobUrl,
        videoUrl : this.videoUrl,
        logUrl : this.logUrl
    }
    var couch = nano('http://127.0.0.1:5984');
    var db = couch.db.use('test_suite_db1');
    db.list({include_docs: true}, function(err, res){
        if (err) return console.log('err: ' + err);
        console.log(res);
        var doc = res.rows[0].doc;
        doc.sauce = sauce;
        var failed = false;
        if (doc.report.results.failed > 0) failed = true;
        db.insert(doc, doc._id, function(err){
            couch.replicate('test_suite_db1', 'http://reupholster.iriscouch.com/pouch_tests', function(err){
                this.setContext('sauce:job-info={"passed": ' + (err === null) + '}', function(){
                  browser.testComplete(function(){
                    if (err) throw err;
                  });
                });
            })
        });

    });
  });




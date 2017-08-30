'use strict';

var attrParse = require("./lib/attributesParser");
var concat = require('concat-stream');
var through = require('through2');
var gutil = require('gulp-util');
var fs = require('fs');
var url = require('url');


module.exports = function(opts) {

    var prefix = opts && opts.prefix || "";
    var attrs = ["img:src", "img:srcset", "img:data-src", "script:src", "link:href"];

    function fileInclude(file, enc, cb) {
        if (file.isNull()) {
            cb(null, file);
        } else if (file.isStream()) {
            file.contents.pipe(concat(function(data) {
                try {
                    data = include(file, String(data));
                    cb(null, data);
                } catch (e) {
                    cb(new gutil.PluginError('gulp-html-url-prefix', e.message));
                }
            }));
        } else if (file.isBuffer()) {
            try {
                file = include(file, String(file.contents));
                cb(null, file);
            } catch (e) {
                cb(new gutil.PluginError('gulp-html-url-prefix', e.message));
            }
        }
    }

    function include(file, content, data) {

        var rawLinks = attrParse(content, function(tag, attr) {
            return attrs.indexOf(tag + ":" + attr) >= 0;
        });
        var links = [];
        rawLinks.forEach(function(link) {
            var length = link.length;
            var start = link.start;
            var valueList = link.value.match(/([^,]+\s\d+\w+)/g) || [link.value];
            valueList.forEach(function(newLink) {
                var trimmed = newLink.trim();
                var cLength = newLink.length;
                var spacePos = trimmed.indexOf(" ");
                var spaceStart = newLink.indexOf(trimmed);
                var len = cLength + spaceStart;
                if (-1 != spacePos) {
                    len = spacePos + spaceStart;
                    trimmed = trimmed.substring(0, spacePos);
                }
                links.push({
                    start: start,
                    length: len,
                    value: trimmed
                });
                start += cLength + 1;
            });
        });

        links.reverse();
        content = [content];
        links.forEach(function(link) {
            if (/^http[s]?:\/\/|^\/\//i.test(link.value)) return;
            var value = url.resolve(prefix, link.value);

            var x = content.pop();
            content.push(x.substr(link.start + link.length));
            content.push(value);
            content.push(x.substr(0, link.start));
        });
        content.reverse();
        content = content.join("");

        file.contents = new Buffer(content);

        return file;
    }

    return through.obj(fileInclude);

}
/*
 * Brackets Themes Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function () {
    "use strict";

    var FileSystem     = brackets.getModule("filesystem/FileSystem"),
        ExtensionUtils = brackets.getModule("utils/ExtensionUtils");

    var commentRegex = /\/\*([\s\S]*?)\*\//mg,
        scrollbarsRegex = /(?:[^}|,]*)::-webkit-scrollbar(?:[\s\S]*?){(?:[\s\S]*?)}/mg;

    /**
    *  Theme object to encasulate all the logic in one pretty bundle.
    *  The theme will self register when it is created.
    *
    *  * Required settings are fileName and path
    *
    * @constructor
    */
    function Theme(options) {
        var _self = this;
        var fileName = options.fileName;
        _self.options = options;

        // Create a display and a theme name from the file name
        _self.fileName    = fileName;
        _self.path        = options.path;
        _self.displayName = toDisplayName(fileName);
        _self.name        = fileName.substring(0, fileName.lastIndexOf('.'));
    }


    Theme.prototype.load = function(force) {
        var theme = this;

        if (theme.css && !force) {
            return theme;
        }

        var file = FileSystem.getFileForPath (this.path + "/" + this.fileName);
        return readFile(file)
            .then(function(content) {
                var result = extractScrollbars(content);
                theme.scrollbar = result.scrollbar;
                return result.content;
            })
            .then(function(content) {
                return lessify(content, theme);
            })
            .then(function(style) {
                return ExtensionUtils.addEmbeddedStyleSheet(style);
            })
            .then(function(styleNode) {
                theme.css = styleNode;
                return theme;
            })
            .promise();
    };


    /**
    *  Takes all dashes and converts them to white spaces...
    *  Then takes all first letters and capitalizes them.
    */
    function toDisplayName (name) {
        name = name.substring(0, name.lastIndexOf('.')).replace(/-/g, ' ');
        var parts = name.split(" ");

        $.each(parts.slice(0), function (index, part) {
            parts[index] = part[0].toUpperCase() + part.substring(1);
        });

        return parts.join(" ");
    }


    function readFile(file) {
        var deferred = $.Deferred();

        try {
            file.read(function( err, content /*, stat*/ ) {
                if ( err ) {
                    deferred.reject(err);
                    return;
                }

                deferred.resolve(content);
            });
        }
        catch(ex) {
            deferred.reject(false);
        }

        return deferred.promise();
    }


    function extractScrollbars(content) {
        var scrollbar = [];

        // Go through and extract out scrollbar customizations so that we can
        // enable/disable via settings.
        content = content
            .replace(commentRegex, "")
            .replace(scrollbarsRegex, function(match) {
                scrollbar.push(match);
                return "";
            });

        return {
            content: content,
            scrollbar: scrollbar
        };
    }


    function lessify(content, theme) {
        var deferred = $.Deferred(),
            parser = new less.Parser();

        parser.parse("." + theme.name + "{" + content + "}", function (err, tree) {
            if (err) {
                deferred.reject(err);
            }
            else {
                deferred.resolve(tree.toCSS());
            }
        });

        return deferred.promise();
    }


    return Theme;
});


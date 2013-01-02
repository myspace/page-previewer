var fs = require("fs"),
	urlObj = require("url"),
	adConfig = [], length;


function replaceHandler(match) {
	if(match === "*") {
		return ".*";
	} else if(match === "^") {
		return "[^_\\-A-Za-z0-9.%]";
	} else {
		return "\\" + match;
	}
}

function loadAdConfig() {
	fs.readFile("./adblock.txt", "utf8", function(err, data) {
		var arrData, index = 0,
			replaceRegExp = /[.*?^]/g,
			pipeRegExp = /\|/g;
		if(!err && data) {
			arrData = data.split("\n");
			arrData.forEach(function(value){
				var length, 
					index$, indexSep, indexSep2,
					firstChar, secondChar, lastChar,
					domain, ruleRegExp, ruleSimple;

				value = value.trim();

				if( value && !(value.indexOf("!") === 0 || value.indexOf("@@") === 0) ){

					index$ = value.indexOf("$");
					if(index$ != -1) {
						value = value.substring(0, index$);
						if( (value == "|http:") || (value == "|https:") ) {
							return;
						}
					}

					length = value.length;
					firstChar = value.charAt(0);
					lastChar = value.charAt(length - 1);
					if(firstChar === "*") {
						value = value.substring(1);
						length--;
					}
					if(lastChar === "*") {
						value = value.substring(0, length - 1);
						length--;
					}
					
					if(firstChar === "|") {
						secondChar = value.charAt(1);
						if(secondChar === "|") { // handling rule staring with "||"
							indexSep = value.indexOf("/");
							indexSep2 = value.indexOf("^");
							if(indexSep2 !== -1 && ( (indexSep === -1) || (indexSep2 < indexSep)) ) {
								indexSep = indexSep2;
							}
							domain = value.substring(2, indexSep);
						}
					}

					if( (firstChar === "|") || (lastChar === "|") || (value.indexOf("*") !== -1) || (value.indexOf("^") !== -1) ){
						//need reg exp;
						
						if(lastChar === "|") {
							value = value.substring(0, length - 1) + "$";
						}

						value = value.replace(replaceRegExp, replaceHandler);
						
						if(secondChar === "|") {
							value = "http(s?)://([-a-z0-9]+\\.)*" + value.substring(2);
						} else if(firstChar === "|") {
							value = "^" + value.substring(1);
						}

						value = value.replace(pipeRegExp, "\\|");

						ruleRegExp = new RegExp(value, "gi");

					} else {
						//simple rule, indexOf check is enough;
						ruleSimple =  value.toLowerCase();
					}
					adConfig.push( { domain: domain, regExp: ruleRegExp, simple: ruleSimple } );
				}
			});
			
			length = adConfig.length;
		}
	});
}

loadAdConfig();
var util = require("util");
exports.isAdUrl = function(url) {
	var parsedUrl, isAd, index = 0, rule;
	url = url.toLowerCase();
	parsedUrl = urlObj.parse(url);
	
	for(; index < length; index++) {
		rule = adConfig[index];
		if( !(rule.domain && parsedUrl.host.indexOf(rule.domain) === -1) ) {
			if(rule.regExp) {
				isAd = rule.regExp.test(url);
			} else if(rule.simple) {
				isAd = url.indexOf(rule.simple) !== -1;
			}
		}

		if(isAd) {
			return true;
		}
	}
	return false;
};


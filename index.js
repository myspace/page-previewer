var request = require("request"),
	adblock = require("./lib/adblock.js"),
	urlObj = require("url"),
	cheerio = require("cheerio");


function getPreview(urlObj, callback) {
	var url, proxy;

	if(typeof(urlObj) === "object") {
		url = urlObj.url;
		proxy = urlObj.proxy;
	} else {
		url = urlObj;
	}

	var req = request( {
		uri: url,
		proxy: proxy,
		timeout: 10000
	}, function(err, response, body) {
		if(!err && response.statusCode === 200 && body) {
			callback(null, parseResponse(body, url));
		} else {
			callback(null, createResponseData(url, true));
		}
	} );

	req.on("response", function(res) {
		var contentType = res.headers["content-type"];
		if(contentType && contentType.indexOf("text/html") !== 0) {
			req.abort();
			callback(null, parseMediaResponse(res, contentType, url) );
		}
	});
}

function parseResponse(body, url) {
	var doc, 
		title, 
		description,
		mediaType,
		images,
		videos;

	doc = cheerio.load(body);
	title = getTitle(doc);

	description = getDescription(doc);

	mediaType = getMediaType(doc);

	images = getImages(doc, url);

	videos = getVideos(doc);

	return createResponseData(url, false, title, description, "text/html", mediaType, images, videos);
}

function getTitle(doc){
    var title = doc("title").text();

    if(title === undefined || !title){
        title = doc("meta[property='og:title']").attr("content");
    }

    return title;
}

function getDescription(doc){
    var description = doc("meta[name=description]").attr("content");

    if(description === undefined) {
        description = doc("meta[name=Description]").attr("content");

        if(description === undefined) {
            description = doc("meta[property='og:description']").attr("content");
        }
    }

    return description;
}

function getMediaType(doc) {
	var node = doc("meta[name=medium]"),
		content;

	if(node.length) {
		content = node.attr("content");
		return content == "image" ? "photo" : content;
	} else {
		return doc("meta[property='og:type']").attr("content");
	}
}

var minImageSize = 50;
function getImages(doc, pageUrl) {
	var images = [], nodes, src,
		width, height,
		dic;

	nodes = doc("meta[property='og:image']");

	if(nodes.length) {
		nodes.each(function(index, node){
            src = node.attribs["content"];
            if(src){
                src = urlObj.resolve(pageUrl, src);
                images.push(src);
            }
		});
	}

	if(images.length <= 0) {
		src = doc("link[rel=image_src]").attr("href");
		if(src) {
            src = urlObj.resolve(pageUrl, src);
            images = [ src ];
		} else {
			nodes = doc("img");

			if(nodes.length) {
				dic = {};
				images = [];
				nodes.each(function(index, node) {
					src = node.attribs["src"];
					if(src && !dic[src]) {
						dic[src] = 1;
						width = node.attribs["width"] || minImageSize;
						height = node.attribs["height"] || minImageSize;
						src = urlObj.resolve(pageUrl, src);
						if(width >= minImageSize && height >= minImageSize && !isAdUrl(src)) {
							images.push(src);
						}
					}
				});
			}
		}
	}
	return images;
}

function isAdUrl(url) {
	if(url) {
		return adblock.isAdUrl(url);
	} else {
		return false;
	}
}

function getVideos(doc) {
	var videos, 
		nodes, nodeTypes, nodeSecureUrls, 
		nodeType, nodeSecureUrl,
		video, videoType, videoSecureUrl,
		width, height,
		videoObj, index, length;

	nodes = doc("meta[property='og:video']");
	length =  nodes.length;
	if(length) {
		videos = [];
		nodeTypes = doc("meta[property='og:video:type']");
		nodeSecureUrls = doc("meta[property='og:video:secure_url']");
		width = doc("meta[property='og:video:width']").attr("content");
		height = doc("meta[property='og:video:height']").attr("content");
		
		for(index = 0; index < length; index++) {
			video = nodes[index].attribs["content"];
			
			nodeType = nodeTypes[index];
			videoType = nodeType ? nodeType.attribs["content"] : null;

			nodeSecureUrl = nodeSecureUrls[index];
			videoSecureUrl = nodeSecureUrl ? nodeSecureUrl.attribs["content"] : null;

			videoObj = { url: video, secureUrl: videoSecureUrl, type: videoType, width: width, height: height };
			if(videoType.indexOf("video/") === 0) {
				vidoes.splice(0, 0, videoObj);
			} else {
				videos.push(videoObj);
			}
		}
	}

	return videos;
}

function parseMediaResponse(res, contentType, url) {
	if(contentType.indexOf("image/") === 0) {
		return createResponseData(url, false, "", "", contentType, "photo", [url]);
	} else {
		return createResponseData(url, false, "", "", contentType);
	}
}

function createResponseData(url, loadFailed, title, description, contentType, mediaType, images, videos, audios) {
	return {
		url: url,
		loadFailed: loadFailed,
		title: title,
		description: description,
		contentType: contentType,
		mediaType: mediaType || "website",
		images: images,
		videos: videos,
		audios: audios
	};
}

module.exports = getPreview;

let fs = require("fs");
let jsdom = require("jsdom");
let start = Date.now();

require("https").get("https://rawgit.com/amitzur/sample-data/master/presidents.json", res => {
    let str = '';
    res.on("data", data => str += data);
    res.on("end", () => {
        let obj = JSON.parse(str);
        console.log("processing " + obj.length + " items");
        downloadTextFromWikipedia(obj)
            .then(getImagesFromWikipedia)
            .then(obj => {
                fs.writeFileSync("presidents2.json", JSON.stringify(obj, null, '\t'));
                console.log("finished in " + ((Date.now() - start) / 1000).toFixed(2) + " seconds");
            });
    });
});

function getImagesFromWikipedia(obj) {
    return new Promise(resolve => {
        jsdom.env(
            "https://en.wikipedia.org/wiki/List_of_Presidents_of_the_United_States",
            function (err, win) {
                let images = [].map.call(win.document.querySelectorAll(".wikitable.plainrowheaders img"), i => i.src);
                obj.forEach((p, i) => {
                    p.src = images[i];
                });
                resolve(obj);
            });
    });
}

function downloadTextFromWikipedia(obj) {
    return new Promise((resolve, reject) => {

        let count = obj.length, i = 0;
        obj.forEach(p => {
            let name = p.president.trim().replace(/\s/g, "_");
            let filename = "_" + name;
            try {
                p.text = String(fs.readFileSync(filename));
                console.log(name + " exists");
                if (++i === count) {
                    resolve(obj);
                }
            } catch (ex) {
                console.log("fetching data for " + name);
                jsdom.env(
                    "https://en.wikipedia.org/wiki/" + name,
                    function (err, win) {
                        if (err) {
                            console.log("error in " + name);
                            return;
                        }

                        try {
                            let doc = win.document;
                            let t = doc.querySelector("table.infobox");
                            let next = t.nextElementSibling;
                            let str = "";
                            while (!(next.id === "toc" || (next.getAttribute("class") && next.getAttribute("class").indexOf("toc") > -1))) {
                                //console.log("next: " + next.tagName + "." + next.className);
                                if (next.tagName.toUpperCase() === "P") {
                                    str += next.textContent + " ";
                                }
                                next = next.nextElementSibling;
                            }
                            p.text = str;
                            fs.writeFileSync(filename, str);
                            console.log("processed " + name);
                        } catch (ex) {
                            console.log("exception in " + name);
                        }

                        if (++i === count) {
                            resolve(obj);
                        }
                    }
                );
            }
        });
    });
}

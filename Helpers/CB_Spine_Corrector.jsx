/*

--------------------------------------------

	CB_Spine_Corrector.jsx          (A CoverBuilder Helper Script)
	An InDesign CS5 Javascript      (Tested in CS6)
	Version 0.9 Beta
	
	Bruno Herfst 2012

--------------------------------------------

*/

#target InDesign;

//global vars
var destNamespace = "http://brunoherfst.com/";
var destContName = "Settings";
    
//Make certain that user interaction (display of dialogs, etc.) is turned on.
app.scriptPreferences.userInteractionLevel = UserInteractionLevels.interactWithAll;

if (app.documents.length != 0) {
    var docBleed, myCover = app.activeDocument;
    var myDocXMP = myCover.metadataPreferences;
    //check if cover is build with CoverBuilder
    var myOldSpine = myDocXMP.getProperty(destNamespace,destContName + "[3]");
    if(myOldSpine == "") {
        var visit = confirm("This document is not build with the latest version of CoverBuilder.\nDo you want to download the latest version now?");
        if(visit){
            var linkJumper = File(Folder.temp.fullName+"/contact.html");
            linkJumper.open("w");
            var linkBody = '<html><head><META HTTP-EQUIV=Refresh CONTENT="0; URL=http://coverbuilder.brunoherfst.com/"></head><body> <p></body></html>'
            linkJumper.write(linkBody);
            linkJumper.close();
            linkJumper.execute();
        }
    }
    //try and do your job anyway
    docBleed = myCover.documentPreferences.documentBleedTopOffset;
    changeSpineWidth(myCover);
} else {
	alert("Can’t find any open documents.");
}

function changeSpineWidth(myCover) {
	//ref to spinepage
	var mSpine = fetchPage(myCover, "CB-spine", 0);

	//let’s ask the user what the new spine should be
	var newSpine = prompt("New spinewidth in MM:");
	if(isNaN(newSpine)){
		alert("That was not a Number");
	} else {
		//Let’s start with changing the masterSpine
		//But before we do that make sure facing pages is on so the spine will automaticly move the front and back cover.
		var userFacingPages = myCover.documentPreferences.facingPages;
		if(!userFacingPages) {
			myCover.documentPreferences.facingPages = true;
		}
		mSpine.page.resize(CoordinateSpaces.INNER_COORDINATES,
			AnchorPoint.CENTER_ANCHOR,ResizeMethods.REPLACING_CURRENT_DIMENSIONS_WITH,
			[mm2pt(newSpine), mm2pt(mSpine.h)]); //Width * Height in postscript points

		//update spineinfo
		mSpine = fetchPage(myCover, "CB-spine", 0);

		//set userPref back
		if(!userFacingPages) {
			myCover.documentPreferences.facingPages = false;
		}
		//move pageInfo to slug
		var slugHeightFrame = fetchItem(mSpine.page, "pageHeight");

		if(slugHeightFrame != null){
			var myLayerName = "Registration";
			var myLayer = myCover.layers.itemByName(myLayerName);
			if(myLayer.isValid){
				//check if it is locked
				var myLock = myLayer.locked;
				if(myLock){
					//unlock
					myLayer.locked = false;
				}
				positionSlugHeight(mSpine, slugHeightFrame);
				//now update width
				var slugWidthFrame = fetchItem(mSpine.page, "pageWidth");
				if(slugWidthFrame != null){
					positionSlugWidth(mSpine, slugWidthFrame);
				}
				//Now update the CB_Cover master
				var CVR1 = fetchPage(myCover, "CB-cover", 2);
				//get height frame
				slugHeightFrame = fetchItem(CVR1.page, "pageHeight");
				if(slugHeightFrame != null){
					positionSlugHeight(CVR1, slugHeightFrame);
				} else {
					alert("Couldn’t find page height info on CB_Cover");
					return false;
				}
				if(myLock){
					//lock
					myLayer.locked = true;
				}
			} else {
				alert("Could not find layer "+myLayerName);
				return false;
			}
		} else {
			alert("Couldn’t find page height info on CB_Spine");
			return false;
		}
	}
	//Then let’s check for overrides.
	myDocXMP.setProperty(destNamespace, destContName + "[3]", String(newSpine));
	return true;
}

function fetchItem(myPage, myLabel){
	//returns first object that has itemlabel
	var myElements = myPage.parent.allPageItems;
	var len = myElements.length;
	for (var i = len-1; i >= 0; i--){
		if(myElements[i].label == myLabel){
			return myElements[i];
		}
	}
	return null;
}

function positionSlugHeight(myPage, myItem){
	myItem.geometricBounds = [0, myPage.w+docBleed, myPage.h, myPage.w+docBleed+5];
}

function positionSlugWidth(myPage, myItem){
	myItem.geometricBounds = [-docBleed-5, 0, -docBleed, myPage.w];
	myItem.contents = myPage.w.toString();
}

function fetchPage(myCover, myName, myPage){
	var mPage = new Object(); //master spine
	mPage.name = myName;
	try{
		mPage.page = myCover.masterSpreads.item(mPage.name).pages[myPage];
	} catch(e) {
		try {
			//old-school support for unofficial prereleases
			mPage.name = mPage.name.replace(/CB-/g,"AU-");
			mPage.page = myCover.masterSpreads.item(mPage.name).pages[myPage];
		} catch(e) {
			alert("Can’t find the spine!\nYou don’t seem to have master spread "+mPage.name+"?");
			exit(); // I’m done here
		}
	}
	if(!mPage.page.isValid){
		alert("Can’t find the spine!\nWhat happend to master spread "+mPage.name+"?");
		exit(); // I’m done here
	}
	mPage = addPageInfo(mPage);
	return mPage;
}

function addPageInfo(myPage){
	myPage.bounds = myPage.page.bounds;
	myPage.w = doRound(myPage.bounds[3]-myPage.bounds[1], 2);
	myPage.h = doRound(myPage.bounds[2]-myPage.bounds[0], 2);
	return myPage;
}

//------------------- MATH
function doRound(myNum, roundDec) {
	var roundMulit = Math.pow(10,roundDec);
	return Math.round(myNum*roundMulit)/roundMulit;
}
function mm2pt(myNum) {
	//1 millimetre = 2.83464567 PostScript points
	return myNum*2.83464567;
}

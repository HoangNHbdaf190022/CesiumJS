Cesium.Ion.defaultAccessToken =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI4MTI4YjU4ZS05M2I2LTQwMTAtOTEyMS01MGZiZmYwYWZmZjIiLCJpZCI6NzY0MjcsImlhdCI6MTYzOTQ0OTIyNH0.dN_LLPe0iC_dpb5SwUlSOIN9S0xqa-B0xgzEFPi1oDY";

var viewer = new Cesium.Viewer("cesiumContainer");

function xmlToJson(xml) {
  'use strict';
  // Create the return object
  var obj = {}, i, j, attribute, item, nodeName, old;

  if (xml.nodeType === 1) { // element
      // do attributes
      if (xml.attributes.length > 0) {
          obj["attributes"] = {};
          for (j = 0; j < xml.attributes.length; j = j + 1) {
              attribute = xml.attributes.item(j);
              obj["attributes"][attribute.nodeName] = attribute.nodeValue;
          }
      }
  }
  // do children
  if (xml.hasChildNodes()) {
      for (i = 0; i < xml.childNodes.length; i = i + 1) {
          item = xml.childNodes.item(i);
          nodeName = item.nodeName;
          if (nodeName !== '#text') {
              if ((obj[nodeName]) === undefined) {
                  obj[nodeName] = xmlToJson(item);
              } else {
                  if ((obj[nodeName].push) === undefined) {
                      old = obj[nodeName];
                      obj[nodeName] = [];
                      obj[nodeName].push(old);
                  }
                  obj[nodeName].push(xmlToJson(item));
              }
          }
      }
  }
  return obj;
};
function parseXml(xml) {
  var dom = null;
  if (window.DOMParser) {
      try {
          dom = (new DOMParser()).parseFromString(xml, "text/xml");
      }
      catch (e) { dom = null; }
  }
  else if (window.ActiveXObject) {
      try {
          dom = new ActiveXObject('Microsoft.XMLDOM');
          dom.async = false;
          if (!dom.loadXML(xml)) // parse error ..
            window.alert(dom.parseError.reason + dom.parseError.srcText);
      }
      catch (e) { dom = null; }
  }
  else
      alert("cannot parse xml string!");
  return dom;
}
async function getData() {
  const response = await fetch(`https://s3.amazonaws.com/CMSTest/squaw_creek_container_info.xml?fbclid=IwAR0YUCBa-S_HrMLiXeJTsXdmBXJbLa3PoyCBjJKNlRggthLfNYcCxTogiuo`);
  var data = await response.text();
  const dom = parseXml(data);
  const dataXML = xmlToJson(dom)
  return dataXML;
}
getData().then(data => {
  function createPolygon(start, end , id) {
      var array = [];
      
      // Draw polygons through points
      for (var i = start; i < end; i++) {
          for (var j = 0; j < data.STRUCTURES.ROOF.POINTS.POINT[i].attributes.data.split(", ").length; j++) {
              var point = parseFloat((data.STRUCTURES.ROOF.POINTS.POINT[i].attributes.data.split(", ")[j]))
              array.push(point);
          }
      }

// View material
      var displayPolygon = viewer.entities.add({
          polygon: {
              hierarchy: Cesium.Cartesian3.fromDegreesArrayHeights(array),
              perPositionHeight: true,
              material: Cesium.Color.WHITE.withAlpha(0.5),
              outline: true,
              outlineColor: Cesium.Color.BLACK,
          },
          id: id
      });

      // lấy ra dữ liệu của từng cạnh
      var lineData = []
      for (var i = start; i < end; i++) {
          var lineADD = {id : data.STRUCTURES.ROOF.LINES.LINE[i].attributes.id , point : []}
          for (var j = 0; j < data.STRUCTURES.ROOF.LINES.LINE[i].attributes.path.split(", ").length; j++) {
              var path = data.STRUCTURES.ROOF.LINES.LINE[i].attributes.path.split(", ")[j];
              var pointADD = {id:  path , data: []}
              for (var k = start; k < end; k++) {
                  if(path == data.STRUCTURES.ROOF.POINTS.POINT[k].attributes.id){
                      var pointData = data.STRUCTURES.ROOF.POINTS.POINT[k].attributes.data.split(", ");
                      for(var n = 0 ; n<3 ; n++){
                          pointDataFloat = parseFloat(pointData[n])
                          pointADD.data.push(pointDataFloat)
                      }
                      
                  }
                  
              }
              lineADD.point.push(pointADD)
          }    
          lineData.push(lineADD)
      }

      var lineLenght = []
      var chuVi = 0;

// Tinh do dai cac canh & tim trung diem
      for (var i = 0; i < end - start; i++) {
          var startCartesian3Point = Cesium.Cartesian3.fromDegrees(lineData[i].point[0].data[0],lineData[i].point[0].data[1],lineData[i].point[0].data[2]);

          var endCartesian3Point = Cesium.Cartesian3.fromDegrees(lineData[i].point[1].data[0],lineData[i].point[1].data[1],lineData[i].point[1].data[2]);

          var trungDiemX = (startCartesian3Point.x + endCartesian3Point.x)/2
          var trungDiemY = (startCartesian3Point.y + endCartesian3Point.y)/2 
          var trungDiemZ = (startCartesian3Point.z + endCartesian3Point.z)/2

          var trungDiem = {x:trungDiemX,y:trungDiemY,z:trungDiemZ}
          
          var startCartographicPoint = Cesium.Cartographic.fromCartesian(startCartesian3Point);
          var endCartographicPoint = Cesium.Cartographic.fromCartesian(endCartesian3Point);
          
          var ellipsoidGeodesic = new Cesium.EllipsoidGeodesic(startCartographicPoint,
              endCartographicPoint )

          var distance = ellipsoidGeodesic.surfaceDistance;
          chuVi = distance + chuVi;

//View trung diem
          viewer.entities.add({
              position: trungDiem,
              label: {
                fillColor: Cesium.Color.RED.withAlpha(1),
                text: parseFloat(distance.toString()).toFixed(),
                scale :0.5
              },
          });
          var lenghtData = {id: lineData[i].id , length: distance}
          lineLenght.push(lenghtData)
      }

      //tinh trong tam da giac
      var trongTamX = 0;
      var trongTamY = 0;
      var trongTamZ = 0;

      for (var i = 0; i < end - start; i++) {
          var toaDo = Cesium.Cartesian3.fromDegrees(lineData[i].point[0].data[0],lineData[i].point[0].data[1],lineData[i].point[0].data[2]);

          trongTamX = toaDo.x + trongTamX;
          trongTamY = toaDo.y + trongTamY;
          trongTamZ = toaDo.z + trongTamZ;
      }

      var soDiem = end- start;
      if(id == "F0" ){
          trongTamZ = trongTamZ-9
      }
      else if(id == "F1"){
          trongTamZ = trongTamZ+15
      }

      var trongTam = {x:trongTamX/soDiem, y:trongTamY/soDiem , z: trongTamZ/soDiem}

// View Chu Vi
      viewer.zoomTo(viewer.entities.add({
        position: trongTam,
        label: {
        text: parseFloat(chuVi.toString()).toFixed(),
        scale :0.5,
        fillColor: Cesium.Color.BLACK.withAlpha(1)
        },
    }))
      return [displayPolygon, lineLenght];
  }

  var f0 = createPolygon(0, 7,"F0");
  var f1 = createPolygon(7, 14,"F1");
  var f2 = createPolygon(14, 18,"F2");
  var f3 = createPolygon(18, 22,"F3");
  var f4 = createPolygon(22, 25,"F4");
  var f5 = createPolygon(25, 28,"F5");
  var f6 = createPolygon(28, 31,"F6");
  var f7 = createPolygon(31, 34,"F7");

});
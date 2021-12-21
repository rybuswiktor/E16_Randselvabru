import { IfcViewerAPI } from 'web-ifc-viewer';
import { createSideMenuButton } from './utils/gui-creator';
import {
  IFCSPACE,
  IFCOPENINGELEMENT,
  IFCWALLSTANDARDCASE,
  IFCWALL,
  IFCSTAIR,
  IFCCOLUMN,
  IFCSLAB,
  IFCROOF,
  IFCFOOTING,
  IFCFURNISHINGELEMENT
  // IFCSTAIRFLIGHT,
  // IFCRAILING
} from 'web-ifc';
import { MeshBasicMaterial, LineBasicMaterial, Color, EdgesGeometry, WebGLRenderer, Scene, BoxGeometry,
  TextureLoader, Mesh, PerspectiveCamera } from 'three';
import Drawing from 'dxf-writer'
import { HorizontalBlurShader } from 'three/examples/jsm/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/examples/jsm/shaders/VerticalBlurShader.js';
import { jsPDF } from 'jspdf';
// import { exportDXF, exportPDF } from './dxf';
// import { fillSection } from './section-fill';

const container = document.getElementById('viewer-container');
container.classList.add('hidden');

var xxx


function modelWik(xxx) {

  const viewer = new IfcViewerAPI({ container, backgroundColor: 'black' });
  //viewer.addAxes();
  //viewer.addGrid();
  viewer.IFC.setWasmPath('files/');

  viewer.IFC.loader.ifcManager.useWebWorkers(true, 'files/IFCWorker.js');

  // Setup loader

  const lineMaterial = new LineBasicMaterial({ color: 0x555555 });
  const baseMaterial = new MeshBasicMaterial({ color: 0xffffff, side: 2 });

  let model;
  const loadIfc = async (event) => {
    const overlay = document.getElementById('loading-overlay');
    const progressText = document.getElementById('loading-progress');

    overlay.classList.remove('hidden');
    progressText.innerText = `Loading`;

    viewer.IFC.loader.ifcManager.setOnProgress((event) => {
      const percentage = Math.floor((event.loaded * 100) / event.total);
      progressText.innerText = `Loaded ${percentage}%`;
    });

    viewer.IFC.loader.ifcManager.parser.setupOptionalCategories({
      [IFCSPACE]: false,
      [IFCOPENINGELEMENT]: false
    });

    model = await viewer.IFC.loadIfc(event.target.files[0], true);
    model.material.forEach(mat => mat.side = 2);

    createFill(model.modelID);
    viewer.edges.create(`${model.modelID}`, model.modelID, lineMaterial, baseMaterial);
    // viewer.edges.toggle(`${model.modelID}`);

    overlay.classList.add('hidden');
  };

  // const inputElement = document.createElement('input');
  // inputElement.setAttribute('type', 'file');
  // inputElement.classList.add('hidden');
  // inputElement.addEventListener('change', loadIfc, false);
  // document.body.appendChild(inputElement);



  //viewer.IFC.loadIfcUrl('test1.ifc', true);
  viewer.IFC.loadIfcUrl(xxx, true);

  

//viewer.IFC.loadIfcUrl('test2.ifc', true);



  let fills = [];

  async function createFill(modelID) {
    const wallsStandard = await viewer.IFC.loader.ifcManager.getAllItemsOfType(modelID, IFCWALLSTANDARDCASE, false);
    const walls = await viewer.IFC.loader.ifcManager.getAllItemsOfType(modelID, IFCWALL, false);
    const stairs = await viewer.IFC.loader.ifcManager.getAllItemsOfType(modelID, IFCSTAIR, false);
    const columns = await viewer.IFC.loader.ifcManager.getAllItemsOfType(modelID, IFCCOLUMN, false);
    const roofs = await viewer.IFC.loader.ifcManager.getAllItemsOfType(modelID, IFCROOF, false);
    const slabs = await viewer.IFC.loader.ifcManager.getAllItemsOfType(modelID, IFCSLAB, false);
    const ids = [...walls, ...wallsStandard, ...columns, ...stairs, ...slabs, ...roofs];
    const material = new MeshBasicMaterial({ color: 0x555555 });
    material.polygonOffset = true;
    material.polygonOffsetFactor = 10;
    material.polygonOffsetUnits = 1;
    fills.push(viewer.fills.create(`${modelID}`, modelID, ids, material));
  }

  viewer.shadowDropper.darkness = 1.5;

  let counter = 0;

  // let subset;
  const handleKeyDown = async (event) => {
    if (event.code === 'Delete') {
      viewer.removeClippingPlane();
      viewer.dimensions.delete();
    }
    if (event.code === 'KeyF') {
      // viewer.plans.computeAllPlanViews(0);
      await viewer.plans.computeAllPlanViews(0);

    }
    if (event.code === 'KeyR') {
      const planNames = Object.keys(viewer.plans.planLists[0]);
      if (!planNames[counter]) return;
      const current = planNames[counter];
      viewer.plans.goTo(0, current, true);
      viewer.edges.toggle('0');
    }
    if (event.code === 'KeyA') {
      // PDF export

      const currentPlans = viewer.plans.planLists[0];
      const planNames = Object.keys(currentPlans);
      const firstPlan = planNames[0];
      const currentPlan = viewer.plans.planLists[0][firstPlan];

      const documentName = 'test';
      const doc = new jsPDF('p', 'mm', [1000, 1000]);
      viewer.pdf.newDocument(documentName, doc, 20);

      viewer.pdf.setLineWidth(documentName, 0.2);
      viewer.pdf.drawNamedLayer(documentName, currentPlan, 'thick', 200, 200);

      viewer.pdf.setLineWidth(documentName, 0.1);
      viewer.pdf.setColor(documentName, new Color(100, 100, 100));

      const ids = await viewer.IFC.getAllItemsOfType(0, IFCWALLSTANDARDCASE, false);
      const subset = viewer.IFC.loader.ifcManager.createSubset({ modelID: 0, ids, removePrevious: true });
      const edgesGeometry = new EdgesGeometry(subset.geometry);
      const vertices = edgesGeometry.attributes.position.array;
      viewer.pdf.draw(documentName, vertices, 200, 200);

      viewer.pdf.drawNamedLayer(documentName, currentPlan, 'thin', 200, 200);

      viewer.pdf.exportPDF(documentName, 'test.pdf');
    }
    if (event.code === 'KeyB') {
      // DXF EXPORT

      const currentPlans = viewer.plans.planLists[0];
      const planNames = Object.keys(currentPlans);
      const firstPlan = planNames[0];
      const currentPlan = viewer.plans.planLists[0][firstPlan];

      const drawingName = "example";

      viewer.dxf.initializeJSPDF(Drawing);

      viewer.dxf.newDrawing(drawingName);
      viewer.dxf.drawNamedLayer(drawingName, currentPlan, 'thick', 'section', Drawing.ACI.RED);
      viewer.dxf.drawNamedLayer(drawingName, currentPlan, 'thin', 'projection', Drawing.ACI.GREEN);

      const ids = await viewer.IFC.getAllItemsOfType(0, IFCWALLSTANDARDCASE, false);
      const subset = viewer.IFC.loader.ifcManager.createSubset({ modelID: 0, ids, removePrevious: true });
      const edgesGeometry = new EdgesGeometry(subset.geometry);
      const vertices = edgesGeometry.attributes.position.array;
      viewer.dxf.draw(drawingName, vertices, 'other', Drawing.ACI.BLUE);

      viewer.dxf.exportDXF(drawingName);
    }
    if (event.code === 'KeyP') {
      counter++;
    }
    if (event.code === 'KeyO') {
      counter--;
    }
    if (event.code === 'KeyC') {
      // viewer.context.ifcCamera.toggleProjection();
      viewer.shadowDropper.renderShadow(0);
    }
    if (event.code === 'KeyE') {
      viewer.plans.exitPlanView(true);
      viewer.edges.toggle('0');
    }
  };

  window.onmousemove = viewer.IFC.prePickIfcItem;
  window.onkeydown = handleKeyDown;
  window.ondblclick = async () => {
    if (viewer.clipper.active) {
      viewer.clipper.createPlane();
    } else {
      const result = await viewer.IFC.pickIfcItem(true);
      if (!result) return;
      const { modelID, id } = result;
      const props = await viewer.IFC.getProperties(modelID, id, true, false);
      console.log(props);
    }
  };
  
};




//Setup UI
// const loadButton = createSideMenuButton('./resources/folder-icon.svg');
// loadButton.addEventListener('click', () => {
//   loadButton.blur();
//   inputElement.click();
// });

// const sectionButton = createSideMenuButton('./resources/section-plane-down.svg');
// sectionButton.addEventListener('click', () => {
//   sectionButton.blur();
//   viewer.toggleClippingPlanes();
// });

// const dropBoxButton = createSideMenuButton('./resources/dropbox-icon.svg');
// dropBoxButton.addEventListener('click', () => {
//   dropBoxButton.blur();
//   viewer.openDropboxWindow();
// });




// function main for logo cubes

function main() {
  const canvas = document.querySelector('#cubes-cont');
  const renderer = new WebGLRenderer({canvas});
  renderer.physicallyCorrectLights = true;

  const fov = 75;
  const aspect = 2;  // the canvas default
  const near = 0.6;
  const far = 6;
  const camera = new PerspectiveCamera(fov, aspect, near, far);
  camera.position.z = 2.4;

  const scene = new Scene();

  const boxWidth = 1;
  const boxHeight = 1;
  const boxDepth = 1;
  const geometry = new BoxGeometry(boxWidth, boxHeight, boxDepth);

  //const cubes = [];  // just an array we can use to rotate the cubes
  const loader = new TextureLoader();
  
  
  function makeInstance(geometry, URL, x) {
    const material = new MeshBasicMaterial({map: loader.load(URL)});

    const cube = new Mesh(geometry, material);
    scene.add(cube);

    cube.position.x = x;

    return cube;
  }
  
  const cubes = [
    makeInstance(geometry, 'https://cdn.theorg.com/7f9d2308-735d-4d86-bda0-36aabdf1d82c_thumb.png',  0),
    makeInstance(geometry, 'https://media-exp1.licdn.com/dms/image/C4D0BAQFTuOGX9zJ92g/company-logo_200_200/0/1625142284998?e=2159024400&v=beta&t=GjNWsGtdpQQLqvAaKaRRzTj28O5ew1VdUmjh36ROChM', -2.5),
    makeInstance(geometry, 'data:image/jpeg;base64,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',  2.5),
  ];
  
  
  
  
  
  
  

  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  function render(time) {
    time *= 0.001;

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    cubes.forEach((cube, ndx) => {
      const speed = .2 + ndx * .1;
      const rot = time * speed;
      cube.rotation.x = rot;
      cube.rotation.y = rot;
    });

    renderer.render(scene, camera);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();



const canvas_cubes = document.getElementById('cubes-cont');

const cont_pic = document.getElementById('cont-pic');

const cont_back = document.getElementById('cont-back');
cont_back.addEventListener("click", function() {
  document.location.reload(true);
});

const button1 = document.getElementById('axis1');
button1.addEventListener("click", function() {
  //xxx = 'test.ifc';
  cont_back.classList.remove('hidden');
  cont_pic.classList.add('moveup');
  container.classList.remove('hidden');
  //canvas_cubes.classList.add('hidden');
  canvas_cubes.style.display = 'none';
  modelWik('models/E16E01_F_KON_SUB-AKSE1-FORM.ifc');
  console.log(xxx);
  //container.classList.add('hidden');
  const a1_frame = document.getElementById('axis1_frame');
  a1_frame.classList.add('frame');
  
});

const button2 = document.getElementById('axis2');
button2.addEventListener("click", function() {
  //document.location.reload(true);
  //xxx = 'test1.ifc';
  cont_back.classList.remove('hidden');
  cont_pic.classList.add('moveup');
  container.classList.remove('hidden');
  //canvas_cubes.classList.add('hidden');
  canvas_cubes.style.display = 'none';
  modelWik('models/E16E01_F_KON_SUB-AKSE2-FORM.ifc');
  console.log(xxx);
  const a2_frame = document.getElementById('axis2_frame');
  a2_frame.classList.add('frame');
  
});

const button3 = document.getElementById('axis3');
button3.addEventListener("click", function() {
  //document.location.reload(true);
  //xxx = 'test1.ifc';
  cont_back.classList.remove('hidden');
  cont_pic.classList.add('moveup');
  container.classList.remove('hidden');
  //canvas_cubes.classList.add('hidden');
  canvas_cubes.style.display = 'none';
  modelWik('models/E16E01_F_KON_SUB-AKSE3-FORM.ifc');
  console.log(xxx);
  const a3_frame = document.getElementById('axis3_frame');
  a3_frame.classList.add('frame_a3');
  
});

const button4 = document.getElementById('axis4');
button4.addEventListener("click", function() {
  //document.location.reload(true);
  //xxx = 'test1.ifc';
  cont_back.classList.remove('hidden');
  cont_pic.classList.add('moveup');
  container.classList.remove('hidden');
  //canvas_cubes.classList.add('hidden');
  canvas_cubes.style.display = 'none';
  modelWik('models/E16E01_F_KON_SUB-AKSE4-FORM.ifc');
  console.log(xxx);
  const a4_frame = document.getElementById('axis4_frame');
  a4_frame.classList.add('frame_a4');
  
});

const button5 = document.getElementById('axis5');
button5.addEventListener("click", function() {
  //document.location.reload(true);
  //xxx = 'test1.ifc';
  cont_back.classList.remove('hidden');
  cont_pic.classList.add('moveup');
  container.classList.remove('hidden');
  //canvas_cubes.classList.add('hidden');
  canvas_cubes.style.display = 'none';
  modelWik('models/E16E01_F_KON_SUB-AKSE5-FORM.ifc');
  console.log(xxx);
  const a5_frame = document.getElementById('axis5_frame');
  a5_frame.classList.add('frame_a5');
  
});

const button6 = document.getElementById('axis6');
button6.addEventListener("click", function() {
  //document.location.reload(true);
  //xxx = 'test1.ifc';
  cont_back.classList.remove('hidden');
  cont_pic.classList.add('moveup');
  container.classList.remove('hidden');
  //canvas_cubes.classList.add('hidden');
  canvas_cubes.style.display = 'none';
  modelWik('models/E16E01_F_KON_SUB-AKSE6-FORM.ifc');
  console.log(xxx);
  const a6_frame = document.getElementById('axis6_frame');
  a6_frame.classList.add('frame_a6');
  
});

const button7 = document.getElementById('axis7');
button7.addEventListener("click", function() {
  //document.location.reload(true);
  //xxx = 'test1.ifc';
  cont_back.classList.remove('hidden');
  cont_pic.classList.add('moveup');
  container.classList.remove('hidden');
  //canvas_cubes.classList.add('hidden');
  canvas_cubes.style.display = 'none';
  modelWik('models/E16E01_F_KON_SUB-AKSE7-FORM.ifc');
  console.log(xxx);
  const a7_frame = document.getElementById('axis7_frame');
  a7_frame.classList.add('frame_a7');
  
});

const button8 = document.getElementById('axis8');
button8.addEventListener("click", function() {
  //document.location.reload(true);
  //xxx = 'test1.ifc';
  cont_back.classList.remove('hidden');
  cont_pic.classList.add('moveup');
  container.classList.remove('hidden');
  //canvas_cubes.classList.add('hidden');
  canvas_cubes.style.display = 'none';
  modelWik('models/E16E01_F_KON_SUB-AKSE8-FORM.ifc');
  console.log(xxx);
  const a8_frame = document.getElementById('axis8_frame');
  a8_frame.classList.add('frame_a8');
  
});

const buttonFFB2 = document.getElementById('axisFFB2');
buttonFFB2.addEventListener("click", function() {
  //document.location.reload(true);
  //xxx = 'test1.ifc';
  cont_back.classList.remove('hidden');
  cont_pic.classList.add('moveup');
  container.classList.remove('hidden');
  //canvas_cubes.classList.add('hidden');
  canvas_cubes.style.display = 'none';
  modelWik('models/E16E01_F_KON_SUP-DEL1-FORM.ifc');
  console.log(xxx);
  const aFFB2_frame = document.getElementById('axisFFB2_frame');
  aFFB2_frame.classList.add('frame_aFFB2');
  
});

const buttonFFB3 = document.getElementById('axisFFB3');
buttonFFB3.addEventListener("click", function() {
  //document.location.reload(true);
  //xxx = 'test1.ifc';
  cont_back.classList.remove('hidden');
  cont_pic.classList.add('moveup');
  container.classList.remove('hidden');
  //canvas_cubes.classList.add('hidden');
  canvas_cubes.style.display = 'none';
  modelWik('models/E16E01_F_KON_SUP-DEL2-FORM.ifc');
  console.log(xxx);
  const aFFB3_frame = document.getElementById('axisFFB3_frame');
  aFFB3_frame.classList.add('frame_aFFB3');
  
});

const buttonMSS = document.getElementById('axisMSS');
buttonMSS.addEventListener("click", function() {
  //document.location.reload(true);
  //xxx = 'test1.ifc';
  cont_back.classList.remove('hidden');
  cont_pic.classList.add('moveup');
  container.classList.remove('hidden');
  //canvas_cubes.classList.add('hidden');
  canvas_cubes.style.display = 'none';
  modelWik('models/E16E01_F_KON_SUP-DEL3-FORM_small.ifc');
  console.log(xxx);
  const aMSS_frame = document.getElementById('axisMSS_frame');
  aMSS_frame.classList.add('frame_aMSS');
  
});


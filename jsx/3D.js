var SHOWD = (function () {
	var canvasId  //  canvas id
	var canvas // 画布
	var scene
	var controls
	var transformControls
	var clickTimes = 0
	var camera
	var campos = { x: 0, y: 3.5, z: 10 }
	var camrot = {}
	var selectedObjects = []
	var renderer  //  renderer
	var composer  //  组合渲染器
	var outlinePass  //  描边
	var theModel  //  加载模型的临时变量
	var modelg = new THREE.Group()  //  模型组
	var humanmodel = new THREE.Group() // 人模组
	var scalebase = 0.3  //  缩放
	var ydown = -2.49  //  模型高度调节
	var newMaterial  //  选中模型的材料
	var newUuid // 选中模型的uuid
	var newName  //  选中模型的名称
	var labelName // 标注ID
	var newPosition = new THREE.Vector3() // 选中模型的位置
	var newRotation = new THREE.Vector3() // 选中模型的旋转
	var isFabric  //  选中模型是否是面料，值为true或false
	var xzobj  //  选中的模型
	var clickCallback // 单击回调
	var dblCallback // 双击回调
	var markCallback // 标注回调
	var updateMatCallback // 更换材料回调
	// var callbackLabel = []
	var modelSave = []  //  模型内容保存数组
	var fabricSave = []  //  面料保存数组
	var accessoriesSave = []  //  辅料保存数组
	var halfwidth = window.innerWidth / 2;  //  窗口宽的一半
	var halfheight = window.innerHeight / 2;  //  窗口高的一半
	var input_con  //  标注用临时变量
	var labeldiv // 标注用变量
	var labelarr = []  //  标注用临时数组
	var labelSave = []  //  标注的全部信息
	
	function init3dComponent() { // load scene
		function loadScene(id, model, modfiles, fab, acc) { // load scene
			canvasId = id
			const BACKGROUND_COLOR = 0xF9FAFC   // background color
			scene = new THREE.Scene()  // 3d scene
			scene.background = new THREE.Color(BACKGROUND_COLOR)  //  set background
			scene.add(modelg)  // 在scene上加载3d group
			scene.add(humanmodel) // scene加载人模组

			canvas = document.querySelector('#' + canvasId);     // 在id为c的canvas上画出3d

			camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 10000);  // set camera
			camera.position.set(campos.x, campos.y, campos.z)  // set camera position
			camrot = JSON.stringify(camera.rotation)  //  获取摄像机旋转信息

			renderer = new THREE.WebGLRenderer({  // set renderer
				canvas,
				antialias: true  // 抗锯齿
				// alpha: true
			});
			renderer.outputEncoding = THREE.sRGBEncoding
			renderer.setSize(window.innerWidth, window.innerHeight)  //renderer范围
			renderer.shadowMap.enabled = true;   // set shadowmap = false
			renderer.shadowMap.type = THREE.PCFSoftShadowMap
			renderer.setPixelRatio(window.devicePixelRatio);   // 设置设备尺寸
			renderer.logarithmicDepthBuffer = true

			stats = new Stats();
			stats.showPanel(2);
			document.getElementById('three-model-box').appendChild(stats.domElement);
			
			loadModel(model)
			if (fab) {
				loadComponentData(modfiles, fab, acc)
			} else {
				initComponentData(modfiles, fab, acc)
			}

			var hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.61);  // add light
			hemiLight.position.set(0, 50, 0);
			scene.add(hemiLight);

			var dirLight = new THREE.DirectionalLight(0xffffff, 0.30);  // add light
			dirLight.position.set(0, 2, 8);
			dirLight.castShadow = true;
			scene.add(dirLight);

			var dirLight1 = new THREE.DirectionalLight(0xffffff, 0.30);
			dirLight1.position.set(0, 2, -8);
			dirLight1.castShadow = true;
			scene.add(dirLight1);

			// var dirLight2 = new THREE.DirectionalLight(0xffffff, 0.30);
			// dirLight2.position.set(-8, 2, 0);
			// dirLight2.castShadow = true;
			// scene.add(dirLight2);

			// var dirLight3 = new THREE.DirectionalLight(0xffffff, 0.30);
			// dirLight3.position.set(8, 2, 0);
			// dirLight3.castShadow = true;
			// scene.add(dirLight3);

			controls = new THREE.OrbitControls(camera, renderer.domElement);  //  add OrbitControls
			// const currentAngle = controls.getPolarAngle()
			// controls.maxPolarAngle = currentAngle;
			// controls.minPolarAngle = currentAngle;
			controls.enableDamping = true;
			controls.enablePan = true;
			controls.dampingFactor = 0.1;
			controls.enableZoom = true;
			controls.minDistance = 0.2;
			controls.maxDistance = 5;
			controls.autoRotate = false;

			window.addEventListener('resize', onWindowResize, false)

			animate()

			// canvas = document.getElementById(canvasId)
			// canvasL.addEventListener('click', event => onsinclick(event))  //  单击监听
			// canvasL.addEventListener('dblclick', event => ondblclicks(event))  //  双击监听
			// canvasL.addEventListener('touchstart', event => onsinclick( event ))  //  触摸单击监听
			canvas.addEventListener('click', event => makeClick(event))
		}
		return loadScene
	}
	function animate() {  // update
		controls.update();
		renderer.render(scene, camera);
		requestAnimationFrame(animate);
		if( composer ) {
			composer.render()
		}
	}
	function onWindowResize() {  // 自适应屏幕
		camera.aspect = window.innerWidth / window.innerHeight
		camera.updateProjectionMatrix()
		renderer.setSize(window.innerWidth, window.innerHeight)
	}
	function loadModel(path) {
		const modload = new THREE.GLTFLoader()
		modload.setMeshoptDecoder(MeshoptDecoder)
		modload.load(path, function (model) {
			theModel = model.scene
			theModel.traverse( o => {
				if (o.isMesh) {
					o.partName = 'model'
				}
			})
			theModel.scale.set(scalebase, scalebase, scalebase)
			theModel.position.y = ydown
			humanmodel.add(theModel);
		})
	}
	function initComponentData(modfiles, fab, acc) {  //  加载模型和辅料
		modelInfo = modfiles  //  获取默认模型列表
		console.log(modfiles)
		for( let mod = 0; mod < modfiles.length; mod++ ){
			loadDefault(modfiles[mod].partFile, modfiles[mod].partId, modfiles[mod].partName, fab)
		}
		if (acc) {
			for (let i = 0; i < acc.length; i++) {
				loadAccessories(acc[i].accFile, acc[i].accNum, acc[i].accScale, acc[i].accClassify, acc[i].partId, acc[i].isZipper, acc[i].headId, acc[i].headColor, acc[i].specification, acc[i].accMaterial, acc[i].perPrice)
			}
		}
	}
	function loadComponentData(modfiles, fab, acc) {  //  加载模型和辅料
		scene.remove(modelg)
		
		for( let mod = 0; mod < modfiles.length; mod++ ){
			load2Default(modfiles[mod].partFile, modfiles[mod].partId, modfiles[mod].partName, fab)
		}
		if (acc) {
			for (let i = 0; i < acc.length; i++) {
				if (acc[i].headPath) {
					load2Accessories(acc[i].accFile, acc[i].Num, acc[i].accScale, acc[i].accClassify, acc[i].partId, acc[i].isZipper, '', '', acc[i].specification, acc[i].accMaterial, acc[i].perPrice)
					load2Accessories(acc[i].headPath, acc[i].Num, acc[i].accScale, acc[i].accClassify, acc[i].partId, acc[i].isZipper, acc[i].headId, acc[i].headColor, acc[i].specification, acc[i].accMaterial, acc[i].perPrice)
				} else {
					load2Accessories(acc[i].accFile, acc[i].Num, acc[i].accScale, acc[i].accClassify, acc[i].partId, acc[i].isZipper, '', '', acc[i].specification, acc[i].accMaterial, acc[i].perPrice)
				}
			}
		}
	}
	function loadDefault(path, id, name, fab) {  //  加载3D 模型
		const loader = new THREE.GLTFLoader();
		loader.load(path, function (gltf) {
			theModel = gltf.scene
console.log(fab)
			theModel.traverse(o => {
				if (o.isMesh) {
					o.partId = id
					o.partName = name
					o.partPath = path
					o.castShadow = true
					o.receiveShadow = true
				};
			});
			theModel.scale.set(scalebase, scalebase, scalebase)
			theModel.position.y = ydown
			modelg.add(theModel)
		},
		function (xhr) {
			console.log((xhr.loaded / xhr.total * 100 ) + '% loaded')
		},
		function loaderror(error) {
			alert(error, '出现加载错误，请刷新界面！')
		})
	}
	function loadAccessories(path, accnum, scale, classify, partId, isZipper, headId, headColor, specification, accMaterial, perPrice) {
		const flloader = new THREE.GLTFLoader()
		console.log(modelg)
		flloader.load(path, function (fliao) {
			theModel = fliao.scene
			theModel.scale.set(scalebase, scalebase, scalebase)
			theModel.position.y = ydown + 0.01
			theModel.traverse(o => {
				if (o.isMesh) {
					o.castShadow = true
					o.receiveShadow = true
					o.classify = classify
					o.partId = partId
					o.accnum = accnum
					o.accscale = scale
					o.accpath = path
					o.isZipper = isZipper
					if (headId) {
						o.headPath = path
					}
					o.headId = headId
					o.headColor = headColor
					o.specification = specification
					o.accMaterial = accMaterial
					o.perPrice = perPrice
				}
			})
			modelg.add(theModel)
		})
	}
	function load2Accessories(path, accnum, scale, classify, partId, isZipper, headid, color, specification, accMaterial, perPrice) {
		const flloader = new THREE.GLTFLoader()
		flloader.load(path, function (fliao) {
			theModel = fliao.scene
			theModel.scale.set(scalebase, scalebase, scalebase)
			theModel.position.y = ydown + 0.01
			theModel.traverse(o => {
				if (o.isMesh) {
					o.castShadow = true
					o.receiveShadow = true
					o.classify = classify
					o.partId = partId
					o.accnum = accnum
					o.accscale = scale
					o.accpath = path
					o.isZipper = isZipper
					o.specification = specification
					o.accMaterial = accMaterial
					o.perPrice = perPrice
					if (headid) {
						o.headId = headid
						if (color) {
						o.material.color.setHex(parseInt('0x' + color.slice(1)))
						o.headColor = color
						} else {
							o.headColor = ''
						}
					} else {
						o.headId = ''
					}
				}
			})
			modelg.add(theModel)
		})
	}
	function materiall(src, src0, shininess, repeatx, repeaty) {  //  load fabric
		let txtloader = new THREE.TextureLoader()
		let txt = txtloader.load(src)
	
		txt.repeat.set(repeatx, repeaty)
		txt.wrapS = THREE.RepeatWrapping
		txt.wrapT = THREE.RepeatWrapping
		txt.encoding = THREE.sRGBEncoding
		txt.flipY = false
	
		let txt0 = txtloader.load(src0)
		txt0.repeat.set(repeatx, repeaty)
		txt0.wrapS = THREE.RepeatWrapping;
		txt0.wrapT = THREE.RepeatWrapping;
		txt0.encoding = THREE.sRGBEncoding
		txt0.flipY = false
	
		let mtlnew = new THREE.MeshPhongMaterial({
			// color: color,
			map: txt,
			normalMap: txt0,
			side: THREE.DoubleSide,
			shininess: shininess,
		});
		return mtlnew
	}
	function load2Default(path, id, name, fab) {  //  加载3D 模型
		const loader = new THREE.GLTFLoader();
		loader.load(path, function (gltf) {
			theModel = gltf.scene
	
			theModel.traverse(o => {
				if (o.isMesh) {
					o.partId = id
					o.partName = name
					o.partPath = path
					o.castShadow = true
					o.receiveShadow = true
					if (fab) {
						for (let i = 0; i < fab.length; i++) {
							if (fab[i].partId == id) {
								if (fab[i].inName == o.name) {
									let jiequ = fab[i].fabricImg.lastIndexOf(".")
									let kzming = fab[i].fabricImg.substr(jiequ + 1)
									o.material = materiall(fab[i].fabricImg, fab[i].normal, fab[i].shininess, fab[i].repeatx, fab[i].repeaty) // 材质
									o.fabimg = fab[i].fabricImg // 面料图片地址
									o.fabnor = fab[i].normal // 面料法线地址
									o.ingredientName = fab[i].ingredientName // 成分
									o.gramWeight = fab[i].gramWeight // 克重
									o.perPrice = fab[i].perPrice // 价格
								
									if ( fab[i].fabricColor ) {
										o.material.color.setHex(parseInt('0x' + fab[i].fabricColor.slice(1)))
										o.fabcolor = fab[i].fabricColor // 面料颜色
									} else {
										o.fabcolor = ''
									}
								
									o.fabnum = fab[i].fabricNum // 面料唯一编码
									if (kzming == 'png') {
										o.material.transparent = true;
									}
								}
							};
						};
					}
				};
			});
			theModel.scale.set(scalebase, scalebase, scalebase)
			theModel.position.y = ydown
			modelg.add(theModel);
			scene.add(modelg)
		})
	}
	function choose(event) {  //  射线方法获取3D模型
		if (event) {
			var wos = function () {  //  判断设备类型
				var nua = navigator.userAgent,
					isWindowsPhone = /( Windows Phone )/.test(nua),
					isSymbian = /( SymbianOS )/.test(nua) || isWindowsPhone,
					isAndroid = /( Android )/.test(nua),
					isFireFox = /( Firefox )/.test(nua),
					isChrome = /( Chrome | CriOS )/.test(nua),
					isTablet = /( iPad | PlayBook )/.test(nua) || (isAndroid && !/( ?:Mobile )/.test(nua)) || (isFireFox && /( ?:Tablet )/.test(nua)),
					isPhone = /( iPhone )/.test(nua) && !isTablet,
					isPc = !isPhone && !isAndroid && !isSymbian;

				return {
					isTablet: isTablet,
					isPhone: isPhone,
					isAndroid: isAndroid,
                    isPc: isPc,
                    isChrome: isChrome
				};
			}()

			var mouse = new THREE.Vector2();
			 const rect = canvas.getBoundingClientRect();
			 var x = event.clientX
			 var y = event.clientY
			 x -= rect.left;
			 y -= rect.top;

			if (wos.isAndroid || wos.isPhone) {  //  坐标转换
				var touch = event.touches[0]
				mouse.x = (touch.pageX / canvas.offsetWidth) * 2 - 1;
				mouse.y = -(touch.pageY / canvas.offsetHeight) * 2 + 1;
			} else if (wos.isTablet) {
				var touch = event.touches[0]
				mouse.x = (touch.pageX / canvas.offsetWidth) * 2 - 1;
				mouse.y = -(touch.pageY / canvas.offsetHeight) * 2 + 1;
			} else if (wos.isPc) {
				mouse.x = (x / canvas.offsetWidth) * 2 - 1;
				mouse.y = -(y / canvas.offsetHeight) * 2 + 1;
			}

			var raycaster = new THREE.Raycaster();  //  设置射线
			raycaster.setFromCamera(mouse, camera);

			var intersects = raycaster.intersectObjects(modelg.children, true);  //  设置射线获取范围

			return intersects;
		}
	}
	function makeClick(event) { // 区分单双击
	      //  单击模拟双击操作
	      clickTimes++;
	      if (clickTimes === 2) {
	        //当点击次数为2
	        clickTimes = 0; //记得清零
	        //  触发双击事件...
			ondblclicks(event)
	      }
	      setTimeout(function() {
	        if (clickTimes === 1) {
	          clickTimes = 0; // 单击清零
	          //  触发单击事件...
			  onsinclick(event)
	        }
	    }, 250);
	}
	function onsinclick(event) {  //  单击功能
		clickCallback
		// clickCallback()
		var sinintersects = choose(event)  //  获取射线返回的内容
		
		if (sinintersects[0]) {  //  取最近的一个内容
			sinintersects[0].object.updateMatrixWorld()
			const rotQ = new THREE.Quaternion()
			const rotE = new THREE.Euler()
			// const rotv3 = new THREE.Vector3()
			newUuid = sinintersects[0].object.uuid // 模型uuid
			newName = sinintersects[0].object.name;   //  模型名称
			newMaterial = sinintersects[0].object.material;  //  材料信息
			if (sinintersects[0].object.accpath) {
				isFabric = false
			} else {
				isFabric = true
			}
			
			newPosition.addVectors(sinintersects[0].object.geometry.boundingBox.min, sinintersects[0].object.geometry.boundingBox.max)
			newPosition.multiplyScalar(0.5)
			newPosition.applyMatrix4(sinintersects[0].object.matrixWorld)
			
			sinintersects[0].object.getWorldQuaternion(rotQ)
			rotE.setFromQuaternion(rotQ)
			newRotation = rotE
			console.log(newPosition)
			sinintersects[0].object.material = sinintersects[0].object.material.clone();  //  复制选中模型的材料
			if (xzobj != sinintersects[0].object) {
				xzobj = sinintersects[0].object;  //  选中的模型
				setTimeout(function() {if (selectedObjects.length > 0) {selectedObjects.length = 0}}, 2000)  //  选中时颜色显示的时间
			}
			selectedObjects = [xzobj]
			outline(selectedObjects)
			
			onclickCallback()
		} else {
			if( xzobj ) {  //  没选中模型取消高亮
				if (selectedObjects.length > 0) {
					selectedObjects.length = 0
					outline(selectedObjects)
				}
			}
		}
	}
	function outline(selectObj) { // 选中高亮
		//  更改渲染器
		const renderPass = new THREE.RenderPass(scene, camera)
		composer = new THREE.EffectComposer(renderer)
		composer.renderTarget1.texture.encoding = THREE.sRGBEncoding
		composer.renderTarget2.texture.encoding = THREE.sRGBEncoding
		composer.addPass( renderPass )

		let params = {  //  OutlinePass参数
			edgeStrength: 4,
			edgeGlow: 0.5,
			edgeThickness: 1,
			pulsePeriod: 5,
			rotate: false,
			usePatternTexture: false,
		}

		outlinePass = new THREE.OutlinePass(
			new THREE.Vector2(
				document.getElementById(canvasId).clientWidth,
				document.getElementById(canvasId).clientHeight
			),
			scene, camera, selectObj
		)

		outlinePass.edgeStrength = Number(params.edgeStrength)
		outlinePass.edgeGlow = Number(params.edgeGlow)
		outlinePass.edgeThickness = Number(params.edgeThickness)
		outlinePass.pulsePeriod = Number(params.pulsePeriod)
		outlinePass.visibleEdgeColor.set("#f1f1f1")
		outlinePass.hiddenEdgeColor.set("#f1f1f1")

		composer.addPass(outlinePass)
		
		// const FXAA = new THREE.ShaderPass(THREE.FXAAShader)
		// const pixelRatio = renderer.getPixelRatio()
		// // FXAA.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeightndow)
		// FXAA.uniforms['resolution'].value.set(1 / window.innerWidth * pixelRatio)
		// FXAA.uniforms['resolution'].value.set(1 / window.innerHeightndow * pixelRatio)
		// // FXAA.renderToScreen = true
		// composer.addPass(FXAA)
	}
	function meshlabel() {  //  动态设置标注的位置
		let box31 = new THREE.Box3();
		box31.expandByObject(xzobj);
		let v31 = new THREE.Vector3();
		const centerxz1 = box31.getCenter(v31);
		labelpos = centerxz1.project(camera);

		let labelx, labely;
		if (labelpos.x < 0) {
			if (labelpos.x < -0.15) {
				labelx = labelpos.x * halfwidth * 2 + halfwidth;
			} else {
				if (labelpos.x > -0.15 && labelpos.x < -0.1) {
					labelx = labelpos.x * halfwidth * 4 + halfwidth;
				} else {
					if (labelpos.x > -0.1 && labelpos.x < -0.02) {
						labelx = labelpos.x * halfwidth * 10 + halfwidth;
					} else {
						if (labelpos.x > -0.02 && labelpos.x < -0.001) {
							labelx = labelpos.x * halfwidth * 60 + halfwidth;
						} else {
							labelx = labelpos.x * halfwidth + halfwidth * 0.5;
						};
					};
				};
			};
		} else {
			if (labelpos.x > 0.15) {
				labelx = labelpos.x * halfwidth * 1.15 + halfwidth;
			} else {
				if (labelpos.x > 0.1 && labelpos.x < 0.15) {
					labelx = labelpos.x * halfwidth * 1.25 + halfwidth;
				} else {
					if (labelpos.x > 0.02 && labelpos.x < 0.1) {
						labelx = labelpos.x * halfwidth * 2.2 + halfwidth;
					} else {
						if (labelpos.x > 0.001 && labelpos.x < 0.02) {
							labelx = labelpos.x * halfwidth * 8 + halfwidth;
						} else {
							labelx = labelpos.x * halfwidth + halfwidth * 1.15;
						};
					};
				};
			};
		};
		labely = labelpos.y

		const markdivz = document.getElementById('three-model-box')
		labeldiv = document.createElement('div')
		labeldiv.setAttribute('id', labelName);
		labeldiv.classList.add('labeld')
		labeldiv.style.left = Math.round(labelx) + 'px';
		labeldiv.style.top = Math.round(-labely * halfheight * 1.2 + halfheight) + 'px';
		labeldiv.style.position = 'absolute';
		labeldiv.style.placeholder = "请输入标注信息"
		labeldiv.style.width = '18vw';
		labeldiv.style.padding = '1vw';
		labeldiv.style.backgroundColor = '#f1f1f1';
		labeldiv.style.display = 'none'

		input_con = document.createElement('textarea')
		input_con.setAttribute('id', 'input' + labelName)
		input_con.classList.add('labelc')
		input_con.setAttribute('placeholder', '请输入标注信息')

		let button_con = document.createElement('input')
		button_con.setAttribute('type', 'button')
		button_con.onclick = function() {
			labelCallback(labelName)
		}
		button_con.setAttribute('value', '提交');

		let button_del = document.createElement('input');
		button_del.setAttribute('type', 'button');
		button_del.onclick = function() {
			deleteLabel(labelName)
		}
		button_del.setAttribute('value', '删除');

		labeldiv.append(input_con);
		labeldiv.append(button_con);
		labeldiv.append(button_del);
		// document.body.appendChild(labeldiv);
		markdivz.append(labeldiv)
		labelarr = document.getElementsByClassName('labeld')

	}
	function seleteLabel(id) { // 选择标注高亮
		let selectObj = []
		modelg.traverse(o => {
			if( o.isMesh && o.name === id) {
				selectObj = [o]
			}
		})
		
		//  更改渲染器
		const renderPass = new THREE.RenderPass(scene, camera)
		composer = new THREE.EffectComposer(renderer)
		composer.renderTarget1.texture.encoding = THREE.sRGBEncoding
		composer.renderTarget2.texture.encoding = THREE.sRGBEncoding
		composer.addPass( renderPass )
	
		let params = {  //  OutlinePass参数
			edgeStrength: 5,
			edgeGlow: 0.5,
			edgeThickness: 2,
			pulsePeriod: 5,
			rotate: false,
			usePatternTexture: false,
		}
	
		outlinePass = new THREE.OutlinePass(
			new THREE.Vector2(
				document.getElementById(canvasId).clientWidth,
				document.getElementById(canvasId).clientHeight
			),
			scene, camera, selectObj
		)
	
		outlinePass.edgeStrength = Number(params.edgeStrength)
		outlinePass.edgeGlow = Number(params.edgeGlow)
		outlinePass.edgeThickness = Number(params.edgeThickness)
		outlinePass.pulsePeriod = Number(params.pulsePeriod)
		outlinePass.visibleEdgeColor.set("#f1f1f1")
		outlinePass.hiddenEdgeColor.set("#f1f1f1")
	
		composer.addPass(outlinePass)
		
		// const FXAA = new THREE.ShaderPass(THREE.FXAAShader)
		// const pixelRatio = renderer.getPixelRatio()
		// // FXAA.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeightndow)
		// FXAA.uniforms['resolution'].value.set(1 / window.innerWidth * pixelRatio)
		// FXAA.uniforms['resolution'].value.set(1 / window.innerHeight * pixelRatio)
		// // FXAA.renderToScreen = true
		// composer.addPass(FXAA)
	}
	function ondblclicks(event) {  //  双击功能
		dblCallback
		// dblCallback()
		var dblintersects = choose(event);  //  获取射线内容
		console.log(dblintersects, dblintersects[0].object.name)
		if( xzobj ) { // 取消高亮
			if (selectedObjects.length > 0) {
				selectedObjects.length = 0
				outline(selectedObjects)
			}
		}
		if (dblintersects[0]) {  //  取最近的模型
		labelName = dblintersects[0].object.name
			if (xzobj != dblintersects[0].object) {
				if( xzobj ) {
					if (selectedObjects.length > 0) {
						selectedObjects.length = 0
						outline(selectedObjects)
					}
				}
				xzobj = dblintersects[0].object;  //  选中的模型
				setTimeout(function() {if (selectedObjects.length > 0) {selectedObjects.length = 0}}, 2000)  //  选中时显示的时间
			}
			selectedObjects = [xzobj]
			outline(selectedObjects)

			if (labelarr.length == 0) { // 标注的逻辑
				meshlabel();
				labeldiv.style.display = 'block';
				labeldiv.classList.add('active');
				labelin(dblintersects[0].point, dblintersects[0].object.name);
			} else {
				let labelid = []
				let tt = 0;

				for (let j = 0; j < labelarr.length; j++) {
					labelid.push(labelarr[j].id);
				};
				for (let i = 0; i < labelarr.length; i++) {
					if (labelarr[i].id == dblintersects[0].object.name) {
						labelarr[i].style.display = 'block';
						labelarr[i].classList.add('active');

					} else {
						labelarr[i].style.display = 'none';
						labelarr[i].classList.remove('active');
						if (labelid.includes(dblintersects[0].object.name)) {
							console.log(labelarr[i].className);
						} else {
							if (tt == 0) {
								meshlabel();
								// labelp = document.createElement('div');
								labelin(dblintersects[0].point, dblintersects[0].object.name);
								tt++;
							};

						};
					};
				};
			};
			console.log(modelg)
			dblclickCallback()
		} else {
			let hid = document.getElementsByClassName('labeld');
			for (let h = 0; h < hid.length; h++) {
				hid[h].style.display = 'none';  //  隐藏标注
			};
		}
	}
	function labelin(pos, niname) {  //  动态创建标注的圆点
		let pointpos = new THREE.Vector3()

		if (pos.z > 0) {
			pointpos.z = pos.z + 0.06;
		} else {
			pointpos.z = pos.z - 0.06;
		}
		pointpos.x = pos.x;
		pointpos.y = pos.y;

		var yuanxing = new THREE.CircleGeometry(0.02, 36);
		var yxmaterial = new THREE.MeshBasicMaterial({ color: 'red' });
		let yxmesh = new THREE.Mesh(yuanxing, yxmaterial);

		yxmesh.position.set(pointpos.x, pointpos.y, pointpos.z);
		yxmesh.material.side = THREE.DoubleSide;
		yxmesh.geometry.needsUpdate = true;
		yxmesh.nickname = niname;
		modelg.add(yxmesh);
	}
	function updateFabric(src, src0, shininess, repeatx, repeaty, fabnum, color, ingredientName, gramWeight, perPrice) {  //  更换面料
		if(newName) {
			if (isFabric) {
				let jiequ = src.lastIndexOf(".")
				let kzming = src.substr(jiequ + 1)

				let txtloader = new THREE.TextureLoader()  //  加载贴图图片
				let txt = txtloader.load(src);
				
				txt.wrapS = THREE.RepeatWrapping;
				txt.wrapT = THREE.RepeatWrapping;
				txt.repeat.set(repeatx, repeaty);
				txt.encoding = THREE.sRGBEncoding
				txt.flipY = false

				let txt0 = txtloader.load(src0);  //  加载法线图片
				txt0.wrapS = THREE.RepeatWrapping;
				txt0.wrapT = THREE.RepeatWrapping;
				txt0.repeat.set(repeatx, repeaty);
				txt0.encoding = THREE.sRGBEncoding
				txt0.flipY = false

				let mtlnew = new THREE.MeshPhongMaterial({  //  设置材料
					color: parseInt('0x' + color.slice(1)),
					map: txt,
					normalMap: txt0,
					side: THREE.DoubleSide,
					shininess: shininess,
				});

				modelg.traverse(o => {  //  为模型更换面料
					if (o.isMesh) {
						o.castShadow = true
						o.receiveShadow = true
						if (o.name == newName) {
							o.material = mtlnew
							o.fabnum = fabnum
							o.fabimg = src
							o.fabnor = src0
							o.ingredientName = ingredientName
							o.gramWeight = gramWeight
							o.perPrice = perPrice
							
							if (kzming == 'png') {
								o.material.transparent = true;
							}
							if (color && color.indexOf('[') == -1) {
								o.fabcolor = color
								// o.material.color.setHex(parseInt('0x' + color.slice(1)));
							}
						}
					}
				})
				console.log(modelg)
				scene.add(modelg)
			} else {
				alert('请选择3D模型上的面料进行更换')
			}
			allMaterials()
		} else {
			alert('请先选择3D模型上要更换的部位')
		}
	}
	// function updateAccessories(path, idnum, scale, classify, isZipper, headId, headcolor, specification, accMaterial, perPrice) {  //  更换辅料
	// 	if (newName) {
	// 		if (isFabric) {
	// 			alert('请选择3D模型上的辅料进行更换')
	// 		} else {
	// 			modelg.traverse(o => {  //  隐藏清除要替换的辅料
	// 				if (o.isMesh && o.uuid == newUuid) {
	// 					o.visible = false;
	// 					o.geometry.dispose();
	// 					o.material.dispose();
	// 					modelg.remove(o);
	// 				};
	// 			});
	// 			loadforacc(path, idnum,  scale, classify, isZipper, headId, headcolor, specification, accMaterial, perPrice);  //  调用加载辅料
	// 		}
	// 	} else {
	// 		alert('请先选择3D模型上要更换的部位')
	// 	}
	// 	allMaterials()
	// }
	function updateAccessories(path, accnum, scale, classify, isZipper, headId, headcolor, specification, accMaterial, perPrice) {  //  更换辅料
		const accessoriesGroup = new THREE.Group()
		let accessoriesPosition = new THREE.Vector3(-1, 1.6, 0.3)
		let targetObject
		if (xzobj && newName) {
			if (isFabric) {
				alert('请选择3D模型上的辅料进行更换')
			} else {
				modelg.traverse(o => {  //  隐藏清除要替换的辅料
					if (o.isMesh && o.uuid == newUuid) {
						o.visible = false;
						o.geometry.dispose();
						o.material.dispose();
						modelg.remove(o);
					};
				});
				loadforacc(path, accnum,  scale, classify, isZipper, headId, headcolor, specification, accMaterial, perPrice);  //  调用加载辅料
			}
		} else {
			
			const accloader = new THREE.GLTFLoader();
			accloader.load(path, function (fliao) {
				theModel = fliao.scene
				theModel.scale.set(scale * scalebase, scale * scalebase, scale * scalebase)
				theModel.position.set(accessoriesPosition.x, accessoriesPosition.y, accessoriesPosition.z)
				theModel.rotation.x = 1.5
				theModel.traverse(o => {
					if (o.isMesh) {
						targetObject = o
						o.castShadow = true
						o.receiveShadow = true
						o.classify = classify
						o.accnum = accnum
						o.isZipper = isZipper
						o.accpath = path
						if (headId) {
							o.headId = headId
							if (headcolor) {
								o.headColor = headcolor
								o.material.color.setHex(parseInt('0x' + headcolor.slice(1)))
							} else {
								o.headColor = ''
							}
						} else {
							o.headId = ''
						}
						o.specification = specification
						o.accMaterial = accMaterial
						o.perPrice = perPrice
						o.visible = true
					};
				});
				accessoriesGroup.add(theModel)
				scene.add(accessoriesGroup)
				accPlacement(targetObject)
			})
		}
		allMaterials()
	}
	function accPlacement(target) {
		let congui = new function() {
			PX = target.position.x
			PY = target.position.y
			PZ = target.position.z
			RX = target.rotation.x
			RY = target.rotation.y
			RZ = target.rotation.z
		}
		const placeAcc = new THREE.TransformControls(camera, renderer.domElement)
		scene.add(placeAcc)
		placeAcc.setSize(0.2)
		placeAcc.attach(target)
		
		placeAcc.addEventListener('mouseDown', function() {
			controls.enabled = false
		})
		placeAcc.addEventListener('mouseUp', function() {
			controls.enabled = true
		})
		
		let accgui = new dat.GUI()
		accgui.add(congui, 'PX', -5, 5).name('x轴位置').onChange(function(val) {
			target.position.x = val
			accrender()
		})
		accgui.add(congui, 'PY', -1, 1).name('y轴位置').onChange(function(val) {
			target.position.y = val
			accrender()
		})
		accgui.add(congui, 'PZ', -8, 12).name('z轴位置').onChange(function(val) {
			target.position.z = val
			accrender()
		})
		accgui.add(congui, 'RX', 0, Math.PI).name('x轴角度').onChange(function(val) {
			target.rotation.x = val
			accrender()
		})
		accgui.add(congui, 'RY', 0, Math.PI).name('y轴角度').onChange(function(val) {
			target.rotation.y = val
			accrender()
		})
		accgui.add(congui, 'RZ', 0, Math.PI).name('z轴角度').onChange(function(val) {
			target.rotation.z = val
			accrender()
		})
		target.geometry.needsUpdate = true
		console.log(target, )
		function accrender() {
			renderer.render(scene, camera)
		}
		
	}
	function loadforacc(path, accnum,  scale, classify, isZipper, headid, headcolor, specification, accMaterial, perPrice) {  //  load Accessories
		const flloader = new THREE.GLTFLoader();
		flloader.load(path, function (fliao) {
			theModel = fliao.scene
			theModel.scale.set(scale * scalebase, scale * scalebase, scale * scalebase)
			if (headid) {
				theModel.position.set(newPosition.x, newPosition.y + 0.022, newPosition.z - 0.012)
			} else {
				theModel.position.set(newPosition.x, newPosition.y, newPosition.z)
			}
			
			theModel.traverse(o => {
				if (o.isMesh) {
					o.rotation.set(newRotation._x, newRotation._y, newRotation._z)
					o.castShadow = true
					o.receiveShadow = true
					o.classify = classify
					o.accnum = accnum
					o.isZipper = isZipper
					o.accpath = path
					
					if (headid) {
						o.headId = headid
						if (headcolor) {
							o.headColor = headcolor
							o.material.color.setHex(parseInt('0x' + headcolor.slice(1)))
						} else {
							o.headColor = ''
						}
					} else {
						o.headId = ''
					}
					
					o.specification = specification
					o.accMaterial = accMaterial
					o.perPrice = perPrice
					o.visible = true
				};
			});
			
			modelg.add(theModel);
			scene.add(modelg)
		})
	}
	function initZipper(canvasId, zipperData) {
		const BACKGROUND_COLOR = 0xF9FAFC   // background color
		scene = new THREE.Scene()  // 3d scene
		scene.background = new THREE.Color(BACKGROUND_COLOR)  //  set background
		scene.add(modelg)  // 在scene上加载3d group
		
		canvas = document.querySelector('#' + canvasId);     // 在id为c的canvas上画出3d
		
		camera = new THREE.OrthographicCamera(window.innerWidth / -60, window.innerWidth / 60, window.innerHeight / 60, window.innerHeight / -60, 0.1, 100);  // set camera
		camera.position.set(0, 1, 5)  // set camera position
		camrot = JSON.stringify(camera.rotation)  //  获取摄像机旋转信息
				
		renderer = new THREE.WebGLRenderer({ // set renderer
			canvas,
			antialias: true  // 抗锯齿
			// alpha: true
		});
		renderer.outputEncoding = THREE.sRGBEncoding
		renderer.setSize(window.innerWidth, window.innerHeight)  //renderer范围
		renderer.shadowMap.enabled = true;   // set shadowmap = false
		renderer.shadowMap.type = THREE.PCFSoftShadowMap
		renderer.setPixelRatio(window.devicePixelRatio);   // 设置设备尺寸
		renderer.logarithmicDepthBuffer = true	
		console.log(zipperData, zipperData[0].headPath)
		if (zipperData) {
			if (zipperData[0].headPath) {
				loadZipper(zipperData[0].headPath, zipperData[0].zipperId, zipperData[0].headId, zipperData[0].headColor)
			}
			loadZipper(zipperData[0].zipperPath, zipperData[0].zipperId, '', '')
		}
		
		var hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.61);  // add light
		hemiLight.position.set(0, 50, 0);
		scene.add(hemiLight);
				
		var dirLight = new THREE.DirectionalLight(0xffffff, 0.70);  // add light
		dirLight.position.set(0, 2, 2);
		dirLight.castShadow = true;
		scene.add(dirLight);
		
		window.addEventListener('resize', onWindowResize, false)
		update()
	}
	function update() {  // update
		renderer.render(scene, camera);
		requestAnimationFrame(update);
	}
	function loadZipper(path, id, headId, color) {
		const ziploader = new THREE.GLTFLoader();
		ziploader.load(path, function (zipper) {
			theModel = zipper.scene
			theModel.rotation.x = 1.5
			theModel.traverse(o => {
				if (o.isMesh) {
					if (headId) {
						o.headId = headId
						o.accFile = path
						
					} else {
						o.accnum = id
						o.accFile = path
					}
					if (color) {
						o.material.color.setHex(parseInt('0x' + color.slice(1)))
						o.headColor = color
					} else {
						o.headColor = ''
					}
				}
			})
			modelg.add(theModel)
			console.log(modelg)
		})
	}
	function updateHeadStyle(headPath, headId) {
		modelg.traverse(o => {
			if (o.isMesh && o.headId) {
				newMaterial = o.material
				newPosition.addVectors(o.geometry.boundingBox.min, o.geometry.boundingBox.max)
				newPosition.multiplyScalar(0.5)
				newPosition.applyMatrix4(o.matrixWorld)
				o.visible = false
				o.geometry.dispose()
				o.material.dispose()
				modelg.remove(o)
			}
		})
		console.log(newMaterial)
		const flloader = new THREE.GLTFLoader();
		flloader.load(headPath, function (fliao) {
			theModel = fliao.scene
			theModel.scale.set(10, 10, 10)
			theModel.position.set(newPosition.x, newPosition.y + 1.4, newPosition.z - 0.8)
			// theModel.rotation.x = 1.5
			theModel.children[0].headId = headId
			theModel.children[0].headPath = headPath
			theModel.children[0].material = newMaterial
			
			modelg.add(theModel)
		})
	}
	function updateHeadColor(headColor) {
		modelg.traverse(o => {
			if (o.isMesh && o.headId) {
				o.material.color.setHex(parseInt('0x' + headColor.slice(1)))
				o.headColor = headColor
			}
		})
	}
	function getChangeZipper() {
		let saveZipper = []
		let lssave = []
		modelg.traverse(o => {
			if (o.isMesh) {
				let lszip = []
				if (o.accnum) {
					lszip.zipperPath = o.accFile
					lszip.zipperId = o.accnum
				} else {
					lszip.zipperPath =''
					lszip.zipperId = ''
				}
				if (o.headId) {
					lszip.headPath = o.accFile
					lszip.headId = o.headId
				} else {
					lszip.headPath = ''
					lszip.headId = ''
				}
				if (o.headColor) {
					lszip.headColor = o.headColor
				} else {
					lszip.headColor = ''
				}
				lssave.push(lszip)
			}
		})
		
		for (let i = 0; i < lssave.length; i++) {
			if (lssave[i].zipperPath && saveZipper.indexOf(lssave[i].zipperPath) == -1) {
				saveZipper.zipperPath = lssave[i].zipperPath
				saveZipper.zipperId = lssave[i].zipperId
			}
			if (lssave[i].headPath && saveZipper.indexOf(lssave[i].headPath) == -1) {
				saveZipper.headPath = lssave[i].headPath
				saveZipper.headId = lssave[i].headId
			}
			if (lssave[i].headColor && saveZipper.indexOf(lssave[i].headColor) == -1) {
				saveZipper.headColor = lssave[i].headColor
			}
		}
		if (!saveZipper.headColor) {
			saveZipper.headColor = ''
		}
		console.log(saveZipper)
		return saveZipper
	}
	function updateComponent(path, id, name) {  //  更换部件
		modelg.traverse(o => {  //  隐藏清除要替换的部件
			if (o.isMesh) {
				if (o.partName == name) {
					newMaterial = o.material
					o.visible = false
					o.geometry.dispose()
					o.material.dispose()
					modelg.remove(o)
				}
			}
		})
		let loader = new THREE.GLTFLoader()  //  加载替换部件
		loader.load(path, function (tray) {
			theModel = tray.scene
			theModel.traverse(oo => {
				if (oo.isMesh) {
					oo.material = newMaterial
					oo.partId = id
					oo.partName = name
				}
			})
			theModel.scale.set(scalebase, scalebase, scalebase)
			theModel.position.y = ydown
			modelg.add(theModel)
			scene.add(modelg)
		})
		allMaterials()
	}
	function addLight() { // 增加灯光
		let picPosition = new THREE.Vector3()
		picPosition.x = 0.5
		picPosition.y = 1.5
		picPosition.z = 2

		const lightGroup = new THREE.Group()

		const lightTxt = new THREE.TextureLoader()
		const txt = lightTxt.load('img/light.png')
		txt.encoding = THREE.sRGBEncoding
		txt.flipY = false

		const lightMaterial = new THREE.SpriteMaterial({
			map: txt,
			transparent: true,
		})
		 
		const targetMesh = new THREE.Sprite()
		targetMesh.position.set(modelg.position.x, modelg.position.y + 1, modelg.position.z)
		lightGroup.add(targetMesh)
		const lightMesh = new THREE.Sprite(lightMaterial);

		lightMesh.position.set(picPosition.x, picPosition.y, picPosition.z)
		lightMesh.scale.set(0.1,0.1,1.0)
		lightMesh.geometry.needsUpdate = true;
		lightMesh.name = 'dirlight';
		lightGroup.add(lightMesh);

		const spotLight = new THREE.SpotLight(0xffffff, 1);  // add light
		spotLight.position.set(lightMesh.position.x, lightMesh.position.y, lightMesh.position.z);
		spotLight.material = lightMaterial
		spotLight.castShadow = true;
		spotLight.shadow.mapSize.width = 1024
		spotLight.shadow.mapSize.height = 1024
		spotLight.target = targetMesh
		
		lightGroup.add(spotLight);

		const cameraHelper = new THREE.CameraHelper( spotLight.shadow.camera ) 
		// lightGroup.add(lhelper)
		scene.add(lightGroup)
		
		let congui = new function() {
			color = spotLight.color.getHex()
			intensity = spotLight.intensity
			helper = false
		}
		let datgui = new dat.GUI()
		datgui.addColor(congui, 'color').name('光线颜色').onChange(function(val) {
			spotLight.color.setHex(val)
		})
		datgui.add(congui, 'intensity', 0, 2).name('光线明暗').onChange(function(val) {
			spotLight.intensity = val
		})
		datgui.add(congui, 'helper').name('辅助线').onChange(function(val) {
			if (val) {
				scene.add(cameraHelper)
			} else {
				scene.remove(cameraHelper)
			}
		})
		
		transformControls = new THREE.TransformControls(camera, renderer.domElement)
		scene.add(transformControls)
		transformControls.setSize(0.2)
		transformControls.attach(lightMesh)
		transformControls.addEventListener('mouseDown', function() {
			controls.enabled = false
			spotLight.position.set(lightMesh.position.x, lightMesh.position.y, lightMesh.position.z);
		})
		transformControls.addEventListener('mouseUp', function() {
			controls.enabled = true
			spotLight.position.set(lightMesh.position.x, lightMesh.position.y, lightMesh.position.z);
		})
	}
	function addCallbackListener(target, callback) { // 打开相应界面用，前端输入内容
		if (target == 'click') {
			clickCallback = callback
		} else if (target == 'dbclick') {
			dblCallback = callback
		} else if (target == 'mark') {
			markCallback = callback
		} else if (target == 'updateMat') {
			updateMatCallback = callback
		}
	}
	function onclickCallback() {  //  单击回调函数，提供选中模型上的面辅料信息
		clickCallback
		// clickCallback()
		let onclickModel = []
		let onclickFabric = []
		let onclickAccessories = []
		scene.updateMatrixWorld(true)
		
		modelg.traverse( o => {
			if( o.isMesh && o.visible == true ) {
				
				if(o.accpath) {
					o.updateMatrixWorld(true)
					let positionnow = new THREE.Vector3()
					//let positionnow = []
					positionnow.addVectors(o.geometry.boundingBox.min, o.geometry.boundingBox.max)
					positionnow.multiplyScalar(0.5)
					positionnow.applyMatrix4(o.matrixWorld)
					
					// let rotationnow = new THREE.Vector3()
					let rotationnow = []
					
					const rotQ = new THREE.Quaternion()
					const rotE = new THREE.Euler()
					o.getWorldQuaternion(rotQ)
					rotE.setFromQuaternion(rotQ)
					rotationnow = rotE
					
					let lsacc = []
					lsacc.partId = o.partId
					lsacc.accessoriesId = o.accnum
					lsacc.classify = o.classify
					lsacc.accFile = o.accpath
					lsacc.accPosition = positionnow
					lsacc.accRotation = rotationnow
					lsacc.accScale = o.accscale
					lsacc.isZipper = o.isZipper
					lsacc.headId = o.headId
					lsacc.headColor = o.headColor
					lsacc.specification = o.specification
					lsacc.accMaterial = o.accMaterial
					lsacc.perPrice = o.perPrice
						
					onclickAccessories.push(lsacc)
				} else {
					if (o.partName !== undefined) {
						let lsmodel = []
						let lsfab = []
						lsmodel.partName = o.partName
						lsmodel.partId = o.partId
						lsmodel.partPath = o.partPath
						
						lsfab.partId = o.partId
						lsfab.partName = o.partName
						if(o.fabnum) {
							lsfab.inName = o.name
							lsfab.fabricId = o.fabnum
							lsfab.fabricImg = o.fabimg
							lsfab.normal = o.fabnor
							lsfab.shininess = o.material.shininess
							lsfab.repeatx = o.material.map.repeat.x
							lsfab.repeaty = o.material.map.repeat.y
							if (o.fabcolor) {
								lsfab.fabcolor = o.fabcolor
							} else {
								lsfab.fabcolor = ''
							}
							lsfab.ingredientName = o.ingredientName
							lsfab.gramWeight = o.gramWeight
							lsfab.perPrice = o.perPrice
						}
	
						onclickModel.push(lsmodel)
						onclickFabric.push(lsfab)	
					}
				}
			}
		})
		
		console.log(onclickModel, onclickFabric,onclickAccessories)
		return { onclickModel, onclickFabric, onclickAccessories }
	}
	function dblclickCallback() {  //  双击回调函数，提供所有的标注信息
		dblCallback
		// dblCallback()
		let qblabeld = document.getElementsByClassName('labeld')
		let allLabel = []
		for( let lab = 0; lab < qblabeld.length; lab++ ) {
			let lslabel = []
			lslabel.labelId = qblabeld[lab].id
			lslabel.labelContent = qblabeld[lab].children[0].value

			allLabel.push(lslabel)
		}
		if (typeof markCallback === 'function') {
			markCallback (allLabel)
		}
		console.log(allLabel)
		return allLabel
	}
	function allMaterials() { // 更换面辅料及部件的回调函数
		let allPart = []
		let allFabric = []
		let allAccessories = []
		modelg.traverse( o => {
			if(o.isMesh && o.visible == true) {
				if(o.accpath) {
					o.updateMatrixWorld(true)
					let positionnow = new THREE.Vector3()
					positionnow.addVectors(o.geometry.boundingBox.min, o.geometry.boundingBox.max)
					positionnow.multiplyScalar(0.5)
					positionnow.applyMatrix4(o.matrixWorld)
					let rotationnow = []
					const rotQ = new THREE.Quaternion()
					const rotE = new THREE.Euler()
					o.getWorldQuaternion(rotQ)
					rotE.setFromQuaternion(rotQ)
					rotationnow = rotE
					
					let lsacc = []
					lsacc.partId = o.partId
					lsacc.accessoriesId = o.accnum
					lsacc.classify = o.classify
					lsacc.accFile = o.accpath
					lsacc.accPosition = positionnow
					lsacc.accRotation = rotationnow
					lsacc.accScale = o.accscale
					lsacc.isZipper = o.isZipper
					lsacc.headId = o.headId
					lsacc.headColor = o.headColor
					lsacc.specification = o.specification
					lsacc.accMaterial = o.accMaterial
					lsacc.perPrice = o.perPrice
					
					accessoriesSave.push(lsacc)
				} else {
					if (o.partName !== undefined) {
						let lsmodel = []
						let lsfab = []
						lsmodel.partName = o.partName
						lsmodel.partId = o.partId
						lsmodel.partPath = o.partPath
						
						lsfab.partId = o.partId
						lsfab.partName = o.partName
						if(o.fabnum) {
							lsfab.inName = o.name
							lsfab.fabricId = o.fabnum
							lsfab.fabricImg = o.fabimg
							lsfab.normal = o.fabnor
							lsfab.shininess = o.material.shininess
							lsfab.repeatx = o.material.map.repeat.x
							lsfab.repeaty = o.material.map.repeat.y
							if (o.fabcolor) {
								lsfab.fabcolor = o.fabcolor
							} else {
								lsfab.fabcolor = ''
							}
							lsfab.ingredientName = o.ingredientName
							lsfab.gramWeight = o.gramWeight
							lsfab.perPrice = o.perPrice
						}						
				
						modelSave.push(lsmodel)
						fabricSave.push(lsfab)
					}
				}
			}
		})
		if (typeof updatMatCallback === 'function') {
			updateMatCallback({ allPart, allFabric, allAccessories })
		}
		return {allPart, allFabric, allAccessories}
	}
	function labelCallback(id) {  //  标注回调函数，提供新建标注所在模型内部名称（div的id)和标注内容
		markCallback
		// markerCallback()
		let callbackLabel = []
		
		for (let ii = 0; ii < labelarr.length; ii++) {
			if (labelarr[ii].id == id) {
				let ls_label = []
				ls_label.label_id = labelarr[ii].id
				ls_label.label_content = labelarr[ii].children[0].value
			
				labelarr[ii].style.display = 'none'
				callbackLabel.push(ls_label)
			}
		}
		return callbackLabel
	}
	function deleteLabel(id) {  //  删除标注，删除指定id的标注
		const dellabel = document.getElementById('three-model-box')
		const dlabel = document.getElementById(id)
		dellabel.removeChild(dlabel)

		modelg.traverse( o => {
			if( o.isMesh ) {
				if( o.nickname == id ) {
					o.visible = false
					o.geometry.dispose()
					o.material.dispose()
					modelg.remove(o)
				}
			}
		})
	}
	function getChangedData() {  //  保存3D内容
		camera.position.set(campos.x, campos.y, campos.z)
		camera.rotation.set(JSON.parse(camrot)._x, JSON.parse(camrot)._y, JSON.parse(camrot)._z)

		let qblabeld = document.getElementsByClassName('labeld')
		for( let lab = 0; lab < qblabeld.length; lab++ ) {
			let lslabel = []
			lslabel.labelId = qblabeld[lab].id
			lslabel.labelContent = qblabeld[lab].children[0].value

			labelSave.push(lslabel)
		}
		
		modelg.traverse( o => {
			if(o.isMesh && o.visible == true) {
				if(o.accpath) {
					o.updateMatrixWorld(true)
					let positionnow = new THREE.Vector3()
					positionnow.addVectors(o.geometry.boundingBox.min, o.geometry.boundingBox.max)
					positionnow.multiplyScalar(0.5)
					positionnow.applyMatrix4(o.matrixWorld)
					let rotationnow = []
					const rotQ = new THREE.Quaternion()
					const rotE = new THREE.Euler()
					o.getWorldQuaternion(rotQ)
					rotE.setFromQuaternion(rotQ)
					rotationnow = rotE
					
					let lsacc = []
					lsacc.partId = o.partId
					lsacc.accessoriesId = o.accnum
					lsacc.classify = o.classify
					lsacc.accFile = o.accpath
					lsacc.accPosition = positionnow
					lsacc.accRotation = rotationnow
					lsacc.accScale = o.accscale
					lsacc.isZipper = o.isZipper
					lsacc.headId = o.headId
					lsacc.headColor = o.headColor
					lsacc.specification = o.specification
					lsacc.accMaterial = o.accMaterial
					lsacc.perPrice = o.perPrice
					
					accessoriesSave.push(lsacc)
				} else {
					if (o.partName !== undefined) {
						let lsmodel = []
						let lsfab = []
						lsmodel.partName = o.partName
						lsmodel.partId = o.partId
						lsmodel.partPath = o.partPath
						
						lsfab.partId = o.partId
						lsfab.partName = o.partName
						if(o.fabnum) {
							lsfab.inName = o.name
							lsfab.fabricId = o.fabnum
							lsfab.fabricImg = o.fabimg
							lsfab.normal = o.fabnor
							lsfab.shininess = o.material.shininess
							lsfab.repeatx = o.material.map.repeat.x
							lsfab.repeaty = o.material.map.repeat.y
							if (o.fabcolor) {
								lsfab.fabcolor = o.fabcolor
							} else {
								lsfab.fabcolor = ''
							}
							lsfab.ingredientName = o.ingredientName
							lsfab.gramWeight = o.gramWeight
							lsfab.perPrice = o.perPrice
						}						

						modelSave.push(lsmodel)
						fabricSave.push(lsfab)
					}
				}
			}
		})
		console.log(labelSave, modelSave, fabricSave, accessoriesSave)
		return {labelSave, modelSave, fabricSave, accessoriesSave}
	}
	return {
		init3dComponent: init3dComponent,
		loadComponentData: loadComponentData,
		initZipper: initZipper,
		updateHeadStyle: updateHeadStyle,
		updateHeadColor: updateHeadColor,
		getChangeZipper: getChangeZipper,
		updateFabric: updateFabric,
		updateAccessories: updateAccessories,
		updateComponent: updateComponent,
		seleteLabel: seleteLabel,
		deleteLabel: deleteLabel,
		addCallbackListener: addCallbackListener,
		labelCallback: labelCallback,
		addLight: addLight,
		getChangedData: getChangedData,
	}
})()
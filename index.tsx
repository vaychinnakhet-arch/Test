/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
// Fix: Declare global variables from external scripts to prevent 'Cannot find name' errors.
declare var supabase: any;
declare var html2canvas: any;
import { GoogleGenAI, Type } from "@google/genai";

document.addEventListener('DOMContentLoaded', () => {
    // --- SUPABASE & GEMINI SETUP START ---
    const SUPABASE_URL = 'https://jyliwiugabumwfxthyeq.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bGl3aXVnYWJ1bXdmeHRoeWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNzM4NjgsImV4cCI6MjA3NDY0OTg2OH0.uxH_EURPRV1v5xBzNfzkiZm16P15rtWLm-ZzMSWfteg';

    // Fix: supabase was not defined. It is now declared as a global variable.
    const { createClient } = supabase;
    let supabaseClient;
    let genAI;

    function initializeSupabase() {
        try {
            // Fix: Cast string literals to 'string' to avoid "no overlap" comparison errors in TypeScript.
            if ((SUPABASE_URL as string) === 'YOUR_SUPABASE_URL' || (SUPABASE_ANON_KEY as string) === 'YOUR_SUPABASE_ANON_KEY') {
                showNotificationModal("ตั้งค่า Supabase", "กรุณาคัดลอก Supabase URL และ Anon Key มาใส่ในไฟล์ index.tsx ก่อนใช้งาน");
                return false;
            }
            supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log("Supabase client initialized.");
            return true;
        } catch (error) {
            console.error("Supabase initialization failed:", error);
            showNotificationModal("Supabase Error", "ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาตรวจสอบการตั้งค่า Supabase");
            return false;
        }
    }

    function initializeGemini() {
        try {
            if (!process.env.API_KEY) {
                showNotificationModal("ต้องการ API Key", "ไม่พบ Gemini API Key ใน Environment Variables (process.env.API_KEY) กรุณาตั้งค่าก่อนใช้งานฟังก์ชัน AI");
                return false;
            }
            genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
            console.log("Gemini AI client initialized.");
            return true;
        } catch (error) {
            console.error("Gemini initialization failed:", error);
            showNotificationModal("Gemini AI Error", "ไม่สามารถเริ่มต้น Gemini AI ได้: " + (error as Error).message);
            return false;
        }
    }
    // --- SETUP END ---

    // --- CONFIGURATION & CONSTANTS ---
    const CONFIG = {
        FLOORS: [8, 7, 6, 5, 4, 3, 2],
        COMMON_AREA_FLOORS: [2, 3, 4, 5, 6, 7, 8],
        ROOMS_PER_FLOOR: 21,
        ROOMS_ON_FLOOR_2: 18,
        get TOTAL_UNITS() { return ((this.FLOORS.length - 1) * this.ROOMS_PER_FLOOR) + this.ROOMS_ON_FLOOR_2; },
        DB_TABLE_NAME: 'project_data',
        DB_ROW_ID: 1,
        GEMINI_API_MODEL: 'gemini-2.5-flash',
    };

    const taskDefinitions = {
        skimAndPaint: { name: 'งานสกิม/ทาสี', reportName: 'งานสกิมและทาสีห้องพัก', reportEmoji: '🎨', title: 'STATUS งานสกิม / ทาสี', type: 'progress', tasks: [ { name: 'สกิม', color: 'bg-blue-500', textColor: 'text-white' }, { name: 'ทาสี', color: 'bg-orange-400', textColor: 'text-white' } ] },
        topping: { name: 'งานเท TOPPING', reportName: 'งานเทปรับระดับพื้นห้องพัก', reportEmoji: '🛠️', title: 'STATUS งานเท TOPPING', type: 'progress', tasks: [ { name: 'จับปุ่ม/ขังน้ำ', color: 'bg-violet-500', textColor: 'text-white' }, { name: 'เท Topping', color: 'bg-teal-500', textColor: 'text-white' } ] },
        ceiling: { name: 'งานติดตั้งฝ้า', reportName: 'งานติดตั้งฝ้าห้องพัก-ห้องน้ำ', reportEmoji: '🪜', title: 'STATUS งานติดตั้งฝ้า', type: 'progress', tasks: [ { name: 'ขึ้นโครง', color: 'bg-purple-500', textColor: 'text-white' }, { name: 'ติดแผ่น', color: 'bg-lime-500', textColor: 'text-white' } ] },
        texcaWall: { name: 'งานผนัง TEXCA', reportName: 'งานผนัง TEXCA', reportEmoji: '🧱', title: 'STATUS งานผนัง TEXCA WALL', type: 'progress', tasks: [ { name: 'ตีไลน์', color: 'bg-gray-400', textColor: 'text-white' }, { name: 'เขิบ', color: 'bg-stone-500', textColor: 'text-white' }, { name: 'TEXCA', color: 'bg-cyan-500', textColor: 'text-white' } ] },
        furniture: { name: 'งานติดตั้งเฟอร์นิเจอร์', reportName: 'งานติดตั้งเฟอร์นิเจอร์', reportEmoji: '🛋️', title: 'STATUS งานติดตั้งเฟอร์นิเจอร์', type: 'progress', tasks: [ { name: 'ติดตั้งชุดครัว', color: 'bg-orange-500', textColor: 'text-white' }, { name: 'ติดตั้งตู้เสื้อผ้า', color: 'bg-lime-500', textColor: 'text-white' }, ] },
        laminate: { name: 'งานปูพื้นไม้ลามิเนต', reportName: 'งานปูพื้นไม้ลามิเนต', reportEmoji: '🌲', title: 'STATUS งานปูพื้นไม้ลามิเนต', type: 'progress', tasks: [ { name: 'ตรวจรับพื้นที่', color: 'bg-yellow-500', textColor: 'text-black' }, { name: 'ปูพื้นไม้', color: 'bg-amber-800', textColor: 'text-white' }, ] },
        waterproofing: { name: 'งานกันซึม', reportName: 'งานกันซึม', reportEmoji: '🛡️', title: 'STATUS งานกันซึม', type: 'multi-progress', tasks: [ { name: 'ห้องน้ำ', key: 'bathroom', shortName: 'น้ำ', color: 'bg-indigo-500', textColor: 'text-white' }, { name: 'ระเบียง', key: 'balcony', shortName: 'รบ.', color: 'bg-cyan-500', textColor: 'text-white' } ] },
        tiling: { name: 'งานปูกระเบื้อง', reportName: 'งานปูกระเบื้อง', reportEmoji: '🟧', title: 'STATUS งานปูกระเบื้อง', type: 'multi-progress', hasDetailedView: true, tasks: [ { name: 'ห้องน้ำ', key: 'bathroom', shortName: 'น้ำ', color: 'bg-teal-500', textColor: 'text-white' }, { name: 'ระเบียง', key: 'balcony', shortName: 'รบ.', color: 'bg-lime-600', textColor: 'text-white' }, { name: 'ครัว', key: 'kitchen', shortName: 'ครัว', color: 'bg-rose-500', textColor: 'text-white' } ] },
        door: { name: 'งานติดตั้งประตูไม้', reportName: 'งานติดตั้งประตูไม้', reportEmoji: '🚪', title: 'STATUS งานติดตั้งประตูไม้', type: 'multi-progress', tasks: [ { name: 'ประตูหน้า', key: 'front', shortName: 'หน้า', color: 'bg-amber-600', textColor: 'text-white' }, { name: 'ประตูห้องน้ำ', key: 'bathroom', shortName: 'น้ำ', color: 'bg-blue-400', textColor: 'text-white' }, { name: 'อุปกรณ์ประตู', key: 'hardware', shortName: 'อปก.', color: 'bg-green-500', textColor: 'text-white' } ] },
        aluminum: { name: 'งานติดตั้งอลูมิเนียม', reportName: 'งานติดตั้งอลูมิเนียม', reportEmoji: '🪟', title: 'STATUS งานติดตั้งอลูมิเนียม', type: 'multi-progress', hasDetailedView: true, tasks: [ { name: 'บานกั้นห้อง', key: 'partition', shortName: 'กั้น', color: 'bg-sky-400', textColor: 'text-white' }, { name: 'บานออกระเบียง', key: 'balcony', shortName: 'รบ.', color: 'bg-blue-400', textColor: 'text-white' }, { name: 'บานหน้าต่าง', key: 'window', shortName: 'นต.', color: 'bg-teal-400', textColor: 'text-white' } ] },
        wetWork: { name: 'WET WORK', reportName: 'WET WORK', reportEmoji: '💧', title: 'STATUS งาน WET WORK', type: 'inspection', tasks: [ { name: 'CM WW', color: 'bg-orange-400', textColor: 'text-white' }, { name: 'QC WW', color: 'bg-yellow-400', textColor: 'text-black' } ] },
        endProduct: { name: 'END PRODUCT', reportName: 'END PRODUCT', reportEmoji: '✅', title: 'STATUS งาน END PRODUCT', type: 'inspection', tasks: [ { name: 'CM End', color: 'bg-rose-300', textColor: 'text-black' }, { name: 'QC End', color: 'bg-emerald-400', textColor: 'text-black' }, ] },
    };

    const commonAreaDefinitions = {
        "staircase1": { locationName: "บันได ST1", tasks: [ { taskName: "ฉาบผนัง" }, { taskName: "เทปรับระดับ ขัดมัน" }, { taskName: "งานฉาบท้องบันได" }, { taskName: "สกิมทาสี ผนัง" }, { taskName: "ราวบันได" } ]},
        "staircase2": { locationName: "บันได ST2", tasks: [ { taskName: "ฉาบผนัง" }, { taskName: "เทปรับระดับ ขัดมัน" }, { taskName: "งานฉาบท้องบันได" }, { taskName: "สกิมทาสี ผนัง" }, { taskName: "ราวบันได" } ]},
        "electricalRoom": { locationName: "ห้องไฟฟ้า", tasks: [ { taskName: "งานตั้งผนัง texca wall" }, { taskName: "ฉาบแต่งห้องพื้น" }, { taskName: "ทาสี" }, { taskName: "เทปูนระดับ" } ]},
        "garbageRoom": { locationName: "ห้องขยะ", tasks: [ { taskName: "งานก่อผนัง" }, { taskName: "ฉาบแต่งห้องพื้น" }, { taskName: "ทาสี" }, { taskName: "ปูกระเบื้อง" } ]},
        "lift": { locationName: "LIFT", tasks: [ { taskName: "เท Door jam" }, { taskName: "งานฉาบผนัง หน้าลิฟท์" }, { taskName: "งานสกิมทาสีผนัง หน้าลิฟท์" } ]},
        "hallway": { locationName: "ทางเดิน", tasks: [ { taskName: "ติดบานชาร์ป" }, { taskName: "ฝ้า" }, { taskName: "กระเบื้อง" } ]}
    };
    
    // --- STATE VARIABLES ---
    // Fix: Using `any` for projectData to avoid complex type definitions for a dynamically built object.
    let projectData: any = {};
    let currentView = 'residential';
    let currentCategory = 'skimAndPaint';
    let currentDetailedView = 'summary';
    let isSelecting = false;
    // Fix: Specify the type of elements stored in the Set to HTMLElement.
    let selectedCells = new Set<HTMLElement>();
    let confirmCallback = null;
    let toastTimeout;
    let realtimeChannel;

    // --- DATA HANDLING (Supabase) ---
    async function setupRealtimeListenerAndInitApp() {
        showToast("กำลังเชื่อมต่อฐานข้อมูล...", 2000);

        const { data, error } = await supabaseClient
            .from(CONFIG.DB_TABLE_NAME)
            .select('data')
            .eq('id', CONFIG.DB_ROW_ID)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error("Error fetching initial data:", error);
            showNotificationModal("Supabase Error", "ไม่สามารถดึงข้อมูลเริ่มต้นได้: " + error.message);
            return;
        }

        if (data) {
            projectData = data.data;
        } else {
            console.log("No data in Supabase, creating initial document...");
            projectData = generateInitialDataObject();
            const { error: insertError } = await supabaseClient
                .from(CONFIG.DB_TABLE_NAME)
                .insert({ id: CONFIG.DB_ROW_ID, data: projectData });
            
            if (insertError) {
                console.error("Error creating initial document:", insertError);
                showNotificationModal("Supabase Error", "ไม่สามารถสร้างข้อมูลเริ่มต้นได้ กรุณาตรวจสอบว่าสร้างตารางถูกต้อง");
                return;
            }
            showToast("สร้างฐานข้อมูลเริ่มต้นสำเร็จ");
        }
        renderTable();

        if (realtimeChannel) {
            realtimeChannel.unsubscribe();
        }

        realtimeChannel = supabaseClient.channel('project-data-channel')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: CONFIG.DB_TABLE_NAME, filter: `id=eq.${CONFIG.DB_ROW_ID}` },
                (payload) => {
                    console.log('Realtime update received!', payload);
                    projectData = payload.new.data;
                    renderTable();
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                     showToast("เชื่อมต่อ Real-time สำเร็จ!", 2000);
                }
                if (status === 'CHANNEL_ERROR') {
                     console.error('Realtime channel error:', err);
                     showNotificationModal("Connection Error", "การเชื่อมต่อ Real-time ล้มเหลว กรุณาตรวจสอบว่าเปิดใช้งาน Publications ใน Supabase แล้ว");
                }
            });
    }

    function generateInitialDataObject() {
        const data: any = {};
        Object.keys(taskDefinitions).forEach(catKey => {
            const catDef = taskDefinitions[catKey];
            data[catKey] = {};
            CONFIG.FLOORS.forEach(floor => {
                data[catKey][floor] = {};
                const roomsOnThisFloor = (floor === 2) ? CONFIG.ROOMS_ON_FLOOR_2 : CONFIG.ROOMS_PER_FLOOR;
                for (let room = 1; room <= roomsOnThisFloor; room++) {
                    data[catKey][floor][room] = {};
                    const unitData = data[catKey][floor][room];
                     if (catDef.type === 'inspection') {
                         unitData.cmScore = 0;
                         unitData.qcScore = 0;
                         unitData.cmHasMajorDefect = false;
                         unitData.qcHasMajorDefect = false;
                     } else if (catDef.type === 'multi-progress') {
                         catDef.tasks.forEach(task => {
                             unitData[`progress_${task.key}`] = 0;
                         });
                     } else {
                         unitData.taskIndex = 0;
                         unitData.progress = 0;
                     }
                }
            });
        });
        data.commonArea = {};
        Object.keys(commonAreaDefinitions).forEach(locKey => {
            data.commonArea[locKey] = {};
            const locDef = commonAreaDefinitions[locKey];
            data.commonArea[locKey].tasks = {};
            locDef.tasks.forEach((task, taskIndex) => {
                data.commonArray[locKey].tasks[taskIndex] = {};
                const taskData = data.commonArea[locKey].tasks[taskIndex];
                taskData.progress = {};
                CONFIG.COMMON_AREA_FLOORS.forEach(floor => {
                    taskData.progress[floor] = 0;
                });
            });
        });
        return data;
    }
    
    function getProgressColor(progress, baseColor = 'bg-sky-500') {
         if (progress === undefined || progress === 0) return 'bg-white text-black';
         const colorName = baseColor.split('-')[1] || 'sky';
         const colorShade = parseInt(baseColor.split('-')[2] || '500', 10);

         if (progress >= 100) return 'bg-teal-500 text-white';
         if (progress > 60) return `${baseColor}`;
         if (progress > 30) return `bg-${colorName}-${Math.max(100, colorShade-200)} text-black`;
         return `bg-${colorName}-100 text-black`;
    }

    function renderTable() {
        if (Object.keys(projectData).length === 0) {
            document.getElementById('main-table').innerHTML = '<tr><td class="p-4">กำลังโหลดข้อมูลจากฐานข้อมูล...</td></tr>';
            return;
        }

        const captureArea = document.getElementById('capture-area');
        if (currentView === 'residential') {
            captureArea.classList.remove('common-view-active');
            renderResidentialTable();
        } else {
            captureArea.classList.add('common-view-active');
            renderCommonAreaTable();
        }
        updateUI();
    }

    function renderCommonAreaTable() {
        const mainTable = document.getElementById('main-table');
        mainTable.innerHTML = '';
        
        const thead = document.createElement('thead');
        let headerHTML = `<tr class="bg-slate-200">
            <th class="border p-2">LOCATION</th>
            <th class="border p-2">DESCRIPTION</th>`;
        CONFIG.COMMON_AREA_FLOORS.forEach(floor => {
            headerHTML += `<th class="border p-2">${floor}</th>`;
        });
        headerHTML += '</tr>';
        thead.innerHTML = headerHTML;
        mainTable.appendChild(thead);

        const tbody = document.createElement('tbody');
        Object.keys(commonAreaDefinitions).forEach(locKey => {
            const locDef = commonAreaDefinitions[locKey];
            locDef.tasks.forEach((task, taskIndex) => {
                const row = document.createElement('tr');
                if (taskIndex === 0) {
                    row.innerHTML += `<td class="border p-2 font-bold bg-slate-100 align-middle text-xl" rowspan="${locDef.tasks.length}">${locDef.locationName}</td>`;
                }
                row.innerHTML += `<td class="border p-2 text-left bg-slate-50">${task.taskName}</td>`;
                
                const taskData = projectData.commonArea?.[locKey]?.tasks?.[taskIndex];
                CONFIG.COMMON_AREA_FLOORS.forEach(floor => {
                    const progress = taskData?.progress?.[floor] || 0;
                    const styleClasses = getProgressColor(progress);
                    row.innerHTML += `<td class="border p-2 table-cell ${styleClasses}" data-location-key="${locKey}" data-task-index="${taskIndex}" data-floor="${floor}">${progress}%</td>`;
                });
                tbody.appendChild(row);
            });
        });
        mainTable.appendChild(tbody);
    }

    function renderResidentialTable() {
        const mainTable = document.getElementById('main-table');
        mainTable.innerHTML = '';
        const categoryDef = taskDefinitions[currentCategory];
        const categoryTasks = categoryDef.tasks;
        const isInspection = categoryDef.type === 'inspection';
        const isMultiProgress = categoryDef.type === 'multi-progress';
        const isDetailedView = categoryDef.hasDetailedView && currentDetailedView === 'detailed';

        const thead = document.createElement('thead');
        let headerHTML = '';

        if (isDetailedView) {
            headerHTML = `<tr class="bg-slate-200">
                <th class="border p-2" rowspan="2"><span>ชั้น</span></th>
                <th class="border p-2" rowspan="2" style="min-width: 100px;"><span>รายการ</span></th>
                <th class="border p-2" colspan="${CONFIG.ROOMS_PER_FLOOR}"><span>ROOM No.</span></th>
                <th class="border-y border-l bg-white separator-cell" rowspan="2"></th>
                <th class="border p-2 bg-slate-200" rowspan="2"><span>จำนวน</span></th>
                <th class="border p-2 bg-teal-200" rowspan="2"><span>เสร็จ</span></th>
                <th class="border p-2 bg-rose-200" rowspan="2"><span>คงเหลือ</span></th>
            </tr>
            <tr class="bg-slate-50">`;
            for (let i = 1; i <= CONFIG.ROOMS_PER_FLOOR; i++) {
                headerHTML += `<th class="border p-1 md:p-2 font-normal"><span>${i}</span></th>`;
            }
            headerHTML += '</tr>';
        } else {
            headerHTML = `<tr class="bg-slate-200">
                <th class="border p-2" rowspan="2"><span>ชั้น</span></th>
                <th class="border p-2" colspan="${CONFIG.ROOMS_PER_FLOOR}"><span>ROOM No.</span></th>
                <th class="border-y border-l bg-white separator-cell" rowspan="2"></th>
                <th class="border p-2 bg-slate-200" colspan="${isInspection ? 2 : categoryTasks.length}"><span>จำนวน</span></th>
                <th class="border p-2 bg-teal-200" rowspan="2"><span>ผ่าน/เสร็จ</span></th>
                <th class="border p-2 bg-rose-200" rowspan="2"><span>คงเหลือ</span></th>
            </tr>
            <tr class="bg-slate-50">`;
            for (let i = 1; i <= CONFIG.ROOMS_PER_FLOOR; i++) {
                headerHTML += `<th class="border p-1 md:p-2 font-normal"><span>${i}</span></th>`;
            }
            categoryTasks.forEach(task => {
                const colorName = task.color.split('-')[1];
                headerHTML += `<th class="border p-2 bg-${colorName}-100 text-black font-semibold"><span>${task.name}</span></th>`;
            });
            headerHTML += '</tr>';
        }
        thead.innerHTML = headerHTML;
        mainTable.appendChild(thead);

        const tbody = document.createElement('tbody');
        const totals = isDetailedView ? {} : Array(isInspection ? 2 : categoryTasks.length).fill(0);
        let totalCompleted = 0;

        CONFIG.FLOORS.forEach(floor => {
            const roomsOnThisFloor = (floor === 2) ? CONFIG.ROOMS_ON_FLOOR_2 : CONFIG.ROOMS_PER_FLOOR;
            if (isDetailedView) {
                const detailedTasks = categoryDef.tasks;
                let floorCompletedCount = 0;
                for(let room = 1; room <= roomsOnThisFloor; room++) {
                    const unitData = projectData[currentCategory]?.[floor]?.[room] || {};
                    let isRoomComplete = true;
                    detailedTasks.forEach(task => {
                        if ((unitData[`progress_${task.key}`] || 0) < 100) isRoomComplete = false;
                    });
                    if (isRoomComplete) floorCompletedCount++;
                }
                totalCompleted += floorCompletedCount;

                detailedTasks.forEach((task, taskIndex) => {
                    const row = document.createElement('tr');
                    if (taskIndex === 0) {
                        row.innerHTML += `<td class="border p-2 font-bold bg-slate-100 align-middle" rowspan="${detailedTasks.length}"><span>${floor}</span></td>`;
                    }
                    row.innerHTML += `<td class="border p-1 text-left font-semibold bg-slate-50 text-slate-600 text-[11px]">${task.name}</td>`;

                    for (let room = 1; room <= CONFIG.ROOMS_PER_FLOOR; room++) {
                        if (floor === 2 && room > CONFIG.ROOMS_ON_FLOOR_2) {
                            row.innerHTML += `<td class="border p-2 bg-slate-200"></td>`;
                            continue;
                        }
                        const unitData = projectData[currentCategory]?.[floor]?.[room] || {};
                        const progress = unitData[`progress_${task.key}`] || 0;
                        const styleClasses = getProgressColor(progress, task.color);
                        const cell = document.createElement('td');
                        cell.className = `border p-2 table-cell ${styleClasses}`;
                        cell.innerHTML = `<span class="percentage-text">${progress}%</span>`;
                        // Fix: Convert number to string for dataset properties.
                        cell.dataset.floor = String(floor);
                        cell.dataset.room = String(room);
                        row.appendChild(cell);
                    }

                    if (taskIndex === 0) {
                        row.innerHTML += `<td class="border-y border-l bg-white separator-cell" rowspan="${detailedTasks.length}"></td>`;
                        let floorTaskCountsHTML = '<div class="flex flex-col p-1 space-y-0.5 text-xs text-left">';
                        detailedTasks.forEach((task, index) => {
                            let startedCount = 0;
                            for(let r=1; r<=roomsOnThisFloor; r++) {
                                if( (projectData[currentCategory]?.[floor]?.[r]?.[`progress_${task.key}`] || 0) > 0) startedCount++;
                            }
                            totals[task.key] = (totals[task.key] || 0) + startedCount;
                            const borderClass = index === detailedTasks.length - 1 ? '' : 'border-b border-slate-200';
                            floorTaskCountsHTML += `<div class="grid grid-cols-2 gap-2 py-1 ${borderClass}"><span>${task.name}:</span><span class="font-semibold text-right">${startedCount}</span></div>`;
                        });
                        floorTaskCountsHTML += '</div>';
                        const topBorderClass = (floor === CONFIG.FLOORS[0]) ? '' : 'border-t-slate-300 border-t-2';
                        row.innerHTML += `<td class="border ${topBorderClass} p-0 summary-cell align-top" rowspan="${detailedTasks.length}">${floorTaskCountsHTML}</td>`;
                        row.innerHTML += `<td class="border ${topBorderClass} p-2 text-green-700 font-semibold summary-cell align-middle" rowspan="${detailedTasks.length}"><span>${floorCompletedCount}</span></td>`;
                        row.innerHTML += `<td class="border ${topBorderClass} p-2 text-red-700 font-semibold summary-cell align-middle" rowspan="${detailedTasks.length}"><span>${roomsOnThisFloor - floorCompletedCount}</span></td>`;
                    }
                    tbody.appendChild(row);
                });
            } else {
                const row = document.createElement('tr');
                row.innerHTML = `<td class="border p-2 font-bold bg-slate-100"><span>${floor}</span></td>`;
                for (let room = 1; room <= CONFIG.ROOMS_PER_FLOOR; room++) {
                    if (floor === 2 && room > CONFIG.ROOMS_ON_FLOOR_2) {
                        row.innerHTML += `<td class="border p-2 bg-slate-200"></td>`;
                        continue;
                    }
                    const unitData = projectData[currentCategory]?.[floor]?.[room] || {};
                    let styleClasses = 'bg-white text-black';
                    let cellText = '0';
                    if (isInspection) {
                        let scoreToShow = 0, defectToShow = false, stageLabel = '';
                        if (unitData.qcScore > 0) { scoreToShow = unitData.qcScore; defectToShow = unitData.qcHasMajorDefect; stageLabel = 'QC: '; } 
                        else if (unitData.cmScore > 0) { scoreToShow = unitData.cmScore; defectToShow = unitData.cmHasMajorDefect; stageLabel = 'CM: '; }
                        if (scoreToShow > 0) styleClasses = scoreToShow >= 85 ? 'bg-teal-500 text-white' : 'bg-rose-500 text-white';
                        cellText = scoreToShow > 0 ? `${stageLabel}${Number.isInteger(scoreToShow) ? scoreToShow : scoreToShow.toFixed(2)}` : '0';
                        if (defectToShow) cellText += '!';
                    } else if (isMultiProgress) {
                         let totalProgress = 0;
                         const activeTasks = [];
                         categoryDef.tasks.forEach(task => {
                             const progress = unitData[`progress_${task.key}`] || 0;
                             totalProgress += progress;
                             if (progress > 0) activeTasks.push(task.shortName);
                         });
                         const avgProgress = totalProgress / categoryTasks.length;
                         styleClasses = avgProgress >= 100 ? 'bg-teal-500 text-white' : (avgProgress > 0 ? getProgressColor(avgProgress, 'bg-sky-500') : 'bg-white text-black');
                         cellText = `${avgProgress.toFixed(0)}%`;
                         if (activeTasks.length > 0) {
                             const subText = activeTasks.join(' ');
                             cellText += `<div class="sub-task-name absolute bottom-0 left-0 right-0 text-[8px] opacity-70 flex justify-center">${subText}</div>`;
                         }
                    } else {
                         const progress = unitData.progress || 0;
                          const currentTask = categoryTasks[unitData.taskIndex || 0];
                          const isFinalTask = (unitData.taskIndex || 0) === categoryTasks.length - 1;
                          const isCompleted = isFinalTask && progress >= 100;
                          styleClasses = isCompleted ? 'bg-teal-500 text-white' : (progress >= 100 ? `${currentTask.color} ${currentTask.textColor}` : (progress > 0 ? getProgressColor(progress, currentTask.color) : 'bg-white text-black'));
                          cellText = `${progress}%`;
                          if(progress > 0 && !isCompleted) cellText += `<span class="sub-task-name absolute bottom-0 right-1 text-[8px] opacity-70">${currentTask.name}</span>`;
                    }
                    const cell = document.createElement('td');
                    cell.className = `border p-2 table-cell ${styleClasses}`;
                    cell.innerHTML = `<span class="percentage-text">${cellText}</span>`;
                    // Fix: Convert number to string for dataset properties.
                    cell.dataset.floor = String(floor);
                    cell.dataset.room = String(room);
                    row.appendChild(cell);
                }
                row.innerHTML += `<td class="border-y border-l bg-white separator-cell"></td>`;
                let floorCompleted = 0;
                if (isInspection) {
                    let floorCmSubmitted = 0, floorQcSubmitted = 0;
                    for (let room = 1; room <= roomsOnThisFloor; room++) {
                        const unitData = projectData[currentCategory]?.[floor]?.[room] || {};
                        if(unitData.cmScore > 0) floorCmSubmitted++;
                        if(unitData.qcScore > 0) floorQcSubmitted++;
                        const score = unitData.qcScore > 0 ? unitData.qcScore : unitData.cmScore;
                         if (score >= 85) floorCompleted++;
                    }
                    row.innerHTML += `<td class="border p-2 summary-cell"><span>${floorCmSubmitted}</span></td>`;
                    row.innerHTML += `<td class="border p-2 summary-cell"><span>${floorQcSubmitted}</span></td>`;
                    totals[0] += floorCmSubmitted;
                    totals[1] += floorQcSubmitted;
                } else if (isMultiProgress) {
                     const floorCounts = Array(categoryTasks.length).fill(0);
                       for (let room = 1; room <= roomsOnThisFloor; room++) {
                         const unitData = projectData[currentCategory]?.[floor]?.[room] || {};
                         let isRoomComplete = true;
                         categoryDef.tasks.forEach((task, index) => {
                             const progress = unitData[`progress_${task.key}`] || 0;
                             if (progress > 0) floorCounts[index]++;
                             if(progress < 100) isRoomComplete = false;
                         });
                          if (isRoomComplete) floorCompleted++;
                     }
                       floorCounts.forEach((count, i) => {
                         row.innerHTML += `<td class="border p-2 summary-cell"><span>${count}</span></td>`;
                         totals[i] += count;
                       });
                } else {
                    const floorCounts = Array(categoryTasks.length).fill(0);
                    for (let room = 1; room <= roomsOnThisFloor; room++) {
                        const unitData = projectData[currentCategory]?.[floor]?.[room] || {};
                        for (let i = 0; i < unitData.taskIndex; i++) floorCounts[i]++;
                        if (unitData.progress > 0) floorCounts[unitData.taskIndex]++;
                        if (unitData.taskIndex === categoryTasks.length - 1 && unitData.progress >= 100) floorCompleted++;
                    }
                    floorCounts.forEach((count, i) => {
                        row.innerHTML += `<td class="border p-2 summary-cell"><span>${count}</span></td>`;
                        totals[i] += count;
                    });
                }
                const floorRemaining = roomsOnThisFloor - floorCompleted;
                row.innerHTML += `<td class="border p-2 text-green-700 font-semibold summary-cell"><span>${floorCompleted}</span></td>`;
                row.innerHTML += `<td class="border p-2 text-red-700 font-semibold summary-cell"><span>${floorRemaining}</span></td>`;
                totalCompleted += floorCompleted;
                tbody.appendChild(row);
            }
        });
        mainTable.appendChild(tbody);

        const tfoot = document.createElement('tfoot');
        if (isDetailedView) {
            const totalRemaining = CONFIG.TOTAL_UNITS - totalCompleted;
            let summaryHTML = '<div class="flex flex-col p-1 space-y-0.5 text-xs text-left">';
            categoryTasks.forEach((task, index) => {
                 const borderClass = index === categoryTasks.length - 1 ? '' : 'border-b border-slate-200';
                 summaryHTML += `<div class="grid grid-cols-2 gap-2 py-1 ${borderClass}"><span>${task.name}:</span><span class="font-semibold text-right">${totals[task.key] || 0}</span></div>`;
            });
            summaryHTML += '</div>';

            let footerHTML = `<tr class="font-bold bg-slate-200">
                <td class="border p-2" colspan="2"><span>TOTAL ( ${CONFIG.TOTAL_UNITS} UNIT )</span></td>
                <td class="border" colspan="${CONFIG.ROOMS_PER_FLOOR}"></td>
                <td class="border-y border-l bg-white separator-cell"></td>
                <td class="border p-0 bg-slate-100 align-top"><span>${summaryHTML}</span></td>
                <td class="border p-2 bg-teal-100"><span>${totalCompleted}</span></td>
                <td class="border p-2 bg-rose-100"><span>${totalRemaining}</span></td>
            </tr>`;
            tfoot.innerHTML = footerHTML;
        } else {
            const totalRemaining = CONFIG.TOTAL_UNITS - totalCompleted;
            let footerHTML = `<tr class="font-bold bg-slate-200">
                <td class="border p-2" colspan="${CONFIG.ROOMS_PER_FLOOR + 1}"><span>TOTAL ( ${CONFIG.TOTAL_UNITS} UNIT )</span></td>
                <td class="border-y border-l bg-white separator-cell"></td>`;
            // Fix: Cast `totals` to number array to allow `forEach`.
            (totals as number[]).forEach(total => {
                footerHTML += `<td class="border p-2 bg-slate-100"><span>${total}</span></td>`;
            });
            footerHTML += `<td class="border p-2 bg-teal-100"><span>${totalCompleted}</span></td>`;
            footerHTML += `<td class="border p-2 bg-rose-100"><span>${totalRemaining}</span></td></tr>`;
            tfoot.innerHTML = footerHTML;
        }
        mainTable.appendChild(tfoot);
    }
    
    function setupCategoryDropdown() {
        const dropdown = document.getElementById('task-category');
        dropdown.innerHTML = '';
        Object.keys(taskDefinitions).forEach(catKey => {
            const option = document.createElement('option');
            option.value = catKey;
            option.textContent = taskDefinitions[catKey].name;
            if (catKey === currentCategory) option.selected = true;
            dropdown.appendChild(option);
        });
    }
    
    function updateUI() {
        const isCommonView = currentView === 'common';
        const categoryDef = taskDefinitions[currentCategory];

        document.getElementById('dropdown-container').style.display = isCommonView ? 'none' : 'flex';
        document.getElementById('legend').style.display = isCommonView ? 'none' : 'flex';
        document.getElementById('openReportModalBtn').style.display = isCommonView ? 'none' : 'inline-flex';
        document.getElementById('openCommonAreaReportModalBtn').style.display = isCommonView ? 'inline-flex' : 'none';
        document.getElementById('status-title').textContent = isCommonView ? 'STATUS งานพื้นที่ส่วนกลาง' : categoryDef.title;
        
        const tilingToggle = document.getElementById('tiling-view-toggle');
        if (categoryDef.hasDetailedView && !isCommonView) {
            tilingToggle.classList.remove('hidden');
            document.getElementById('view-tiling-summary-btn').classList.toggle('active', currentDetailedView === 'summary');
            document.getElementById('view-tiling-detailed-btn').classList.toggle('active', currentDetailedView === 'detailed');
        } else {
            tilingToggle.classList.add('hidden');
        }

        document.getElementById('update-date').textContent = new Date().toLocaleDateString('th-TH', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        if (!isCommonView) {
            updateLegend();
        }
    }
    
    function updateLegend() {
        const legend = document.getElementById('legend');
        legend.innerHTML = '<strong>คำอธิบาย:</strong>';
        const categoryDef = taskDefinitions[currentCategory];

        if (categoryDef.hasDetailedView && currentDetailedView === 'detailed') {
             categoryDef.tasks.forEach(task => {
                legend.innerHTML += `<div class="flex items-center gap-2"><div class="w-5 h-5 rounded ${task.color}"></div><span>${task.name}</span></div>`;
            });
            legend.innerHTML += `<div class="flex items-center gap-2"><div class="w-5 h-5 rounded bg-teal-500"></div><span>เสร็จสมบูรณ์ (100%)</span></div>`;
        } else if (categoryDef.type === 'inspection') {
            legend.innerHTML += `<div class="flex items-center gap-2"><div class="w-5 h-5 rounded bg-teal-500"></div><span>ผ่าน (>= 85)</span></div>`;
            legend.innerHTML += `<div class="flex items-center gap-2"><div class="w-5 h-5 rounded bg-rose-500"></div><span>ไม่ผ่าน (< 85)</span></div>`;
            legend.innerHTML += `<div class="flex items-center gap-2"><span class="font-bold text-lg">!</span><span>พบ Major Defect</span></div>`;
        } else if (categoryDef.type === 'multi-progress') {
            legend.innerHTML += `<div class="flex items-center gap-2"><div class="w-5 h-5 rounded bg-sky-100"></div><span>เริ่มดำเนินการ (1-30%)</span></div>`;
            legend.innerHTML += `<div class="flex items-center gap-2"><div class="w-5 h-5 rounded bg-sky-300"></div><span>คืบหน้า (31-60%)</span></div>`;
            legend.innerHTML += `<div class="flex items-center gap-2"><div class="w-5 h-5 rounded bg-sky-500"></div><span>คืบหน้ามาก (61-99%)</span></div>`;
            legend.innerHTML += `<div class="flex items-center gap-2"><div class="w-5 h-5 rounded bg-teal-500"></div><span>เสร็จสมบูรณ์ (100%)</span></div>`;
            legend.innerHTML += `<div class="flex items-center gap-2"><span class="font-semibold text-xs border rounded px-1 bg-gray-200">ชื่อย่อ</span><span>แสดงงานย่อยที่เริ่มทำแล้ว</span></div>`;
        } else {
            categoryDef.tasks.forEach(task => {
                legend.innerHTML += `<div class="flex items-center gap-2"><div class="w-5 h-5 rounded ${task.color}"></div><span>${task.name}</span></div>`;
            });
            legend.innerHTML += `<div class="flex items-center gap-2"><div class="w-5 h-5 rounded bg-teal-500"></div><span>เสร็จสมบูรณ์</span></div>`;
        }
    }
    
    function openModal(modalId) {
        (document.getElementById(modalId) as HTMLElement).style.display = 'flex';
        document.body.classList.add('modal-open');
    }
    
    function closeModal(modalId) {
        (document.getElementById(modalId) as HTMLElement).style.display = 'none';
        document.body.classList.remove('modal-open');
        if(modalId === 'updateModal') clearSelection();
    }

    function openUpdateModal(cell: HTMLElement) {
        if (currentView === 'residential') {
            openResidentialUpdateModal();
        } else {
            openCommonAreaUpdateModal(cell);
        }
    }

    function openCommonAreaUpdateModal(cell: HTMLElement) {
        const { locationKey, taskIndex, floor } = cell.dataset;
        const locDef = commonAreaDefinitions[locationKey];
        const taskDef = locDef.tasks[taskIndex];
        const progress = projectData.commonArea?.[locationKey]?.tasks?.[taskIndex]?.progress?.[floor] || 0;

        document.getElementById('modal-title').textContent = `อัพเดท: ${locDef.locationName}`;
        document.getElementById('modal-description').innerHTML = `งาน: <span class="font-semibold">${taskDef.taskName}</span><br>ชั้น: <span class="font-semibold">${floor}</span>`;
        
        document.getElementById('modal-inspection-view').classList.add('hidden');
        document.getElementById('modal-multi-progress-view').classList.add('hidden');

        const progressView = document.getElementById('modal-progress-view');
        progressView.classList.remove('hidden');
        // Fix: Cast element to HTMLElement to access style property.
        (document.getElementById('modal-task-select') as HTMLElement).style.display = 'none';
        (document.querySelector('label[for="modal-task-select"]') as HTMLElement).style.display = 'none';
        // Fix: Cast element to HTMLInputElement to access value property.
        (document.getElementById('progress-input') as HTMLInputElement).value = String(progress);
        
        openModal('updateModal');
    }

    function openResidentialUpdateModal() {
        if (selectedCells.size === 0) return;
        const firstCell = selectedCells.values().next().value;
        const { floor, room } = firstCell.dataset;
        const unitData = projectData[currentCategory]?.[floor]?.[room] || {};
        const categoryDef = taskDefinitions[currentCategory];

        document.getElementById('modal-title').textContent = selectedCells.size > 1 ? `อัพเดทสถานะ (${selectedCells.size} ห้อง)` : 'อัพเดทสถานะ';
        document.getElementById('modal-description').innerHTML = `ห้อง: <span id="modal-room-id" class="font-semibold">${selectedCells.size > 1 ? 'ห้องที่เลือก' : `${floor} / ${room}`}</span>`;

        document.getElementById('modal-progress-view').classList.add('hidden');
        document.getElementById('modal-inspection-view').classList.add('hidden');
        document.getElementById('modal-multi-progress-view').classList.add('hidden');
        // Fix: Cast element to HTMLElement to access style property.
        (document.getElementById('modal-task-select') as HTMLElement).style.display = 'block';
        (document.querySelector('label[for="modal-task-select"]') as HTMLElement).style.display = 'block';

        if (categoryDef.type === 'inspection') {
            document.getElementById('modal-inspection-view').classList.remove('hidden');
            // Fix: Cast elements to their correct types (HTMLSelectElement, HTMLInputElement).
            const stageSelect = document.getElementById('inspection-stage-select') as HTMLSelectElement;
            const scoreInput = document.getElementById('score-input') as HTMLInputElement;
            const defectCheckbox = document.getElementById('major-defect-checkbox') as HTMLInputElement;
            const isMultiSelect = selectedCells.size > 1;
            const defaultStage = isMultiSelect ? 0 : (unitData.qcScore > 0 ? 1 : (unitData.cmScore > 0 ? 0 : 0));
            stageSelect.value = String(defaultStage);

            const updateInspectionUI = () => {
                const stage = parseInt(stageSelect.value, 10);
                scoreInput.value = isMultiSelect ? '' : String(stage === 0 ? unitData.cmScore : unitData.qcScore);
                defectCheckbox.checked = isMultiSelect ? false : (stage === 0 ? unitData.cmHasMajorDefect : unitData.qcHasMajorDefect);
            };
            updateInspectionUI();
            stageSelect.onchange = updateInspectionUI;
        } else if (categoryDef.type === 'multi-progress') {
            const view = document.getElementById('modal-multi-progress-view');
            const isMultiSelect = selectedCells.size > 1;
            view.innerHTML = '';
            categoryDef.tasks.forEach(task => {
                const progress = isMultiSelect ? '' : (unitData[`progress_${task.key}`] || 0);
                view.innerHTML += `
                    <div class="mb-4">
                        <label for="progress-input-${task.key}" class="block text-sm font-medium text-gray-700">${task.name} (%):</label>
                        <input type="number" id="progress-input-${task.key}" data-key="${task.key}" min="0" max="100" value="${progress}" class="multi-progress-input mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2">
                    </div>
                `;
            });
            view.classList.remove('hidden');
        } else {
            document.getElementById('modal-progress-view').classList.remove('hidden');
            const categoryTasks = categoryDef.tasks;
            // Fix: Cast elements to their correct types (HTMLSelectElement, HTMLInputElement).
            const taskSelect = document.getElementById('modal-task-select') as HTMLSelectElement;
            const progressInput = document.getElementById('progress-input') as HTMLInputElement;
            const isMultiSelect = selectedCells.size > 1;
            taskSelect.innerHTML = '';
            categoryTasks.forEach((task, index) => taskSelect.innerHTML += `<option value="${index}">${task.name}</option>`);
            
            if (isMultiSelect) {
                taskSelect.value = "0";
                progressInput.value = '';
            } else {
                let taskToShowIndex = unitData.taskIndex;
                if (unitData.progress >= 100 && unitData.taskIndex < categoryTasks.length - 1) taskToShowIndex++;
                taskSelect.value = String(taskToShowIndex);
                progressInput.value = String((taskToShowIndex === unitData.taskIndex) ? unitData.progress : 0);
            }
        }
        
        openModal('updateModal');
    }
    
    function showConfirmModal(title, message, callback) {
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        confirmCallback = callback;
        openModal('confirmModal');
    }

    function showNotificationModal(title, message) {
        document.getElementById('notification-title').textContent = title;
        document.getElementById('notification-message').textContent = message;
        openModal('notificationModal');
    }

    function showToast(message, duration = 3000) {
        const toast = document.getElementById('toast') as HTMLElement;
        const toastMessage = document.getElementById('toast-message');
        if (!toast || !toastMessage) return;
        
        toastMessage.textContent = message;
        toast.style.transform = 'translateX(0)';

        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.style.transform = 'translateX(120%)';
        }, duration);
    }

    async function saveProgress() {
        // Fix: Cast element to HTMLButtonElement to access its properties.
        const saveBtn = document.getElementById('saveProgressBtn') as HTMLButtonElement;
        const originalBtnText = saveBtn.textContent;
        saveBtn.textContent = 'กำลังบันทึก...';
        saveBtn.disabled = true;
        
        const updatedData = JSON.parse(JSON.stringify(projectData));

        if (currentView === 'residential') {
            applyResidentialProgressUpdates(updatedData);
        } else {
            applyCommonAreaProgressUpdates(updatedData);
        }

        try {
            const { error } = await supabaseClient
                .from(CONFIG.DB_TABLE_NAME)
                .update({ data: updatedData })
                .eq('id', CONFIG.DB_ROW_ID);

            if (error) throw error;

            showToast('บันทึกข้อมูลสำเร็จ');
            closeModal('updateModal');
        } catch (error) {
            console.error("Error saving data to Supabase: ", error);
            showNotificationModal("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
        } finally {
            saveBtn.textContent = originalBtnText;
            saveBtn.disabled = false;
        }
    }
    
    function applyCommonAreaProgressUpdates(data) {
        // Fix: Cast element to HTMLInputElement to access its value.
        const newProgress = parseInt((document.getElementById('progress-input') as HTMLInputElement).value, 10);
        if (isNaN(newProgress) || newProgress < 0 || newProgress > 100) return;

        selectedCells.forEach(cell => {
            // Fix: Cast cell to HTMLElement to access dataset.
            const { locationKey, taskIndex, floor } = cell.dataset;
            data.commonArea[locationKey].tasks[taskIndex].progress[floor] = newProgress;
        });
    }

    function applyResidentialProgressUpdates(data) {
        const categoryDef = taskDefinitions[currentCategory];
        if (categoryDef.type === 'inspection') {
            // Fix: Cast elements to access their properties.
            const stage = parseInt((document.getElementById('inspection-stage-select') as HTMLSelectElement).value, 10);
            const newScoreStr = (document.getElementById('score-input') as HTMLInputElement).value;
            if (newScoreStr === '') return;
            const newScore = parseFloat(newScoreStr);
            if (isNaN(newScore) || newScore < 0 || newScore > 100) return;
            const hasDefect = (document.getElementById('major-defect-checkbox') as HTMLInputElement).checked;

            selectedCells.forEach(cell => {
                const { floor, room } = cell.dataset;
                const unitData = data[currentCategory][floor][room];
                if (stage === 0) {
                    unitData.cmScore = newScore;
                    unitData.cmHasMajorDefect = hasDefect;
                } else {
                    unitData.qcScore = newScore;
                    unitData.qcHasMajorDefect = hasDefect;
                    if (unitData.cmScore === 0) {
                        unitData.cmScore = 100;
                        unitData.cmHasMajorDefect = false;
                    }
                }
            });
        } else if (categoryDef.type === 'multi-progress') {
            const inputs = document.querySelectorAll('.multi-progress-input');
            selectedCells.forEach(cell => {
                const { floor, room } = cell.dataset;
                const unitData = data[currentCategory][floor][room];
                inputs.forEach(input => {
                    // Fix: Cast input element to access its properties.
                    const valueStr = (input as HTMLInputElement).value;
                    if (valueStr !== '') {
                        const value = parseInt(valueStr, 10);
                        if (!isNaN(value) && value >= 0 && value <= 100) {
                            unitData[`progress_${(input as HTMLInputElement).dataset.key}`] = value;
                        }
                    }
                });
            });
        } else {
            // Fix: Cast elements to access their values.
            const selectedTaskIndex = parseInt((document.getElementById('modal-task-select') as HTMLSelectElement).value, 10);
            const newProgressStr = (document.getElementById('progress-input') as HTMLInputElement).value;
            if (newProgressStr === '') return;
            const newProgress = parseInt(newProgressStr, 10);
            if (isNaN(newProgress) || newProgress < 0 || newProgress > 100) return;

            selectedCells.forEach(cell => {
                const { floor, room } = cell.dataset;
                const unitData = data[currentCategory][floor][room];
                unitData.taskIndex = selectedTaskIndex;
                unitData.progress = newProgress;
            });
        }
    }
    
    function exportData() {
        try {
            const dataStr = JSON.stringify(projectData, null, 2);
            const dataBlob = new Blob([dataStr], {type: "application/json"});
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.download = `vay-chinnakhet-data-${Date.now()}.json`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
            showToast("ส่งออกข้อมูลสำเร็จ");
        } catch (error) {
            console.error("Export failed:", error);
            showNotificationModal("ส่งออกข้อมูลไม่สำเร็จ", "เกิดข้อผิดพลาดขณะเตรียมข้อมูลสำหรับส่งออก");
        }
    }

    function importData(event: Event) {
        // Fix: Cast event target to HTMLInputElement to access files.
        const file = (event.target as HTMLInputElement).files[0];
        if (!file) return;
        const reader = new FileReader();
        // Fix: Add type to event and check that result is a string before parsing.
        reader.onload = (e: ProgressEvent<FileReader>) => {
            if (e.target && typeof e.target.result === 'string') {
                try {
                    const importedData = JSON.parse(e.target.result);
                    if (!importedData.skimAndPaint) {
                       throw new Error("ไฟล์ข้อมูลไม่ตรงกับโครงสร้างที่คาดไว้");
                    }
                    showConfirmModal(
                        'ยืนยันการนำเข้าข้อมูล',
                        'การนำเข้าข้อมูลจะเขียนทับข้อมูลบนเซิร์ฟเวอร์ทั้งหมด คุณแน่ใจหรือไม่?',
                        async () => {
                            try {
                                const { error } = await supabaseClient
                                    .from(CONFIG.DB_TABLE_NAME)
                                    .update({ data: importedData })
                                    .eq('id', CONFIG.DB_ROW_ID);
                                if (error) throw error;
                                showToast('นำเข้าข้อมูลเรียบร้อยแล้ว');
                            } catch (err) {
                                console.error("Supabase update failed:", err);
                                showNotificationModal('เกิดข้อผิดพลาด', 'ไม่สามารถเขียนข้อมูลลงฐานข้อมูลได้');
                            } finally {
                                closeModal('confirmModal');
                            }
                        }
                    );
                } catch (err) { 
                    console.error("Error parsing JSON file:", err); 
                    showNotificationModal('เกิดข้อผิดพลาด', `ไฟล์ที่นำเข้าไม่ถูกต้อง: ${(err as Error).message}`);
                }
            }
        };
        reader.readAsText(file);
        (event.target as HTMLInputElement).value = '';
    }

    function captureForLine() {
        const captureArea = document.getElementById('capture-area');
        // Fix: Cast element to HTMLButtonElement.
        const captureBtn = document.getElementById('captureBtn') as HTMLButtonElement;
        const originalBtnHTML = captureBtn.innerHTML;

        captureBtn.innerHTML = 'กำลังแคปเจอร์...';
        captureBtn.disabled = true;
        document.body.classList.add('is-line-capturing');

        setTimeout(() => {
            const width = captureArea.scrollWidth;
            const height = captureArea.scrollHeight;
            // Fix: html2canvas is now declared as a global variable.
            html2canvas(captureArea, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                width: width,
                height: height,
                windowWidth: width,
                windowHeight: height
            }).then(canvas => {
                const link = document.createElement('a');
                link.download = `line-update-${Date.now()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            }).catch(err => {
                console.error('Capture failed:', err);
                showNotificationModal('เกิดข้อผิดพลาด', 'ไม่สามารถสร้างไฟล์ภาพได้');
            }).finally(() => {
                document.body.classList.remove('is-line-capturing');
                captureBtn.innerHTML = originalBtnHTML;
                captureBtn.disabled = false;
            });
        }, 200); 
    }
    
    // --- AI & REPORTING FUNCTIONS ---
    function setupAndOpenReportModal() {
         renderReportUI();
         openModal('reportModal');
    }

    function renderReportUI() {
        const reportContentArea = document.getElementById('report-content-area');
        
        const controlsHTML = `
            <div class="lg:col-span-1 flex flex-col gap-4">
                <div>
                     <div class="flex justify-between items-center pr-2">
                         <h3 class="font-semibold px-2 mb-2">1. เลือกและจัดลำดับงาน</h3>
                         <div>
                             <button id="selectAllTasksBtn" class="text-xs text-indigo-600 hover:underline">เลือกทั้งหมด</button>
                             <button id="deselectAllTasksBtn" class="text-xs text-gray-500 hover:underline ml-2">ล้างทั้งหมด</button>
                         </div>
                     </div>
                     <div id="report-task-list-container"></div>
                </div>
                <div class="border-t pt-4">
                     <div class="flex justify-between items-center pr-2">
                         <h3 class="font-semibold px-2 mb-2">2. เลือกชั้นที่ต้องการรายงาน</h3>
                         <div>
                             <button id="selectAllFloorsBtn" class="text-xs text-indigo-600 hover:underline">เลือกทั้งหมด</button>
                             <button id="deselectAllFloorsBtn" class="text-xs text-gray-500 hover:underline ml-2">ล้างทั้งหมด</button>
                         </div>
                     </div>
                      <div id="report-floor-list-container"></div>
                </div>
                <div class="border-t pt-4">
                     <h3 class="font-semibold px-2 mb-2">3. ตัวเลือกเพิ่มเติม</h3>
                      <div id="report-options-container"></div>
                </div>
            </div>
        `;

        const outputHTML = `
            <div class="xl:col-span-2 flex flex-col xl:border-l xl:pl-4 min-h-0">
                <div class="flex flex-col gap-2">
                    <div id="report-type-toggle" class="bg-slate-200 p-1 rounded-lg text-slate-800 text-sm font-semibold flex">
                        <button id="toggle-simple-report" class="report-type-toggle-btn flex-1 px-3 py-2 rounded-md active">สร้างรายงาน</button>
                        <button id="toggle-ai-report" class="report-type-toggle-btn flex-1 px-3 py-2 rounded-md">สร้างรายงานด้วย AI</button>
                    </div>

                    <div id="simple-report-view">
                         <button id="generateRawReportBtn" class="w-full mt-2 px-4 py-3 bg-slate-500 text-white font-semibold rounded-lg hover:bg-slate-600 transition-colors">
                             สร้าง
                         </button>
                    </div>
                    <div id="ai-report-view" class="hidden mt-2 bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                        <p class="font-semibold text-center text-indigo-800 mb-2">เลือกรูปแบบรายงาน AI</p>
                        <div class="grid grid-cols-2 gap-2">
                             <button id="generateAITextBtn" class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                แบบข้อความ
                             </button>
                             <button id="generateAIInfographicBtn" class="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                                แบบ Infographic
                             </button>
                        </div>
                    </div>
                </div>
                
                <div class="relative flex-grow mt-4 min-h-0">
                    <div id="ai-loading-overlay" class="absolute inset-0 items-center justify-center hidden rounded-lg">
                        <div class="text-center p-4 bg-white/80 rounded-lg shadow-md">
                            <div class="spinner mx-auto"></div>
                            <p class="mt-2 font-semibold text-indigo-700">AI กำลังวิเคราะห์ข้อมูล...</p>
                        </div>
                    </div>
                    <div id="report-output-container" class="w-full h-full border rounded-lg bg-slate-50 overflow-auto">
                        <textarea id="ai-output-text" class="w-full h-full p-3 bg-transparent text-sm" placeholder="ผลลัพธ์จะแสดงที่นี่..."></textarea>
                        <div id="ai-output-infographic" class="hidden p-4 bg-white"></div>
                    </div>
                </div>

                <div id="report-actions" class="flex-shrink-0 flex gap-2 mt-2">
                     <button id="copyReportBtn" class="flex-grow p-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors inline-flex items-center justify-center gap-2" title="คัดลอกสรุป">
                         <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>
                         <span>คัดลอก</span>
                     </button>
                     <button id="downloadInfographicBtn" class="flex-grow p-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors inline-flex items-center justify-center gap-2 hidden" title="ดาวน์โหลด Infographic">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line></svg>
                        <span>ดาวน์โหลด</span>
                     </button>
                </div>
            </div>
        `;
        
        reportContentArea.innerHTML = controlsHTML + outputHTML;

        bindReportButtonListeners();
        populateReportUI();
    }

    function bindReportButtonListeners() {
        // Main Toggles
        const simpleToggle = document.getElementById('toggle-simple-report');
        const aiToggle = document.getElementById('toggle-ai-report');
        const simpleView = document.getElementById('simple-report-view');
        const aiView = document.getElementById('ai-report-view');

        simpleToggle.addEventListener('click', () => {
            simpleToggle.classList.add('active');
            aiToggle.classList.remove('active');
            simpleView.classList.remove('hidden');
            aiView.classList.add('hidden');
        });

        aiToggle.addEventListener('click', () => {
            aiToggle.classList.add('active');
            simpleToggle.classList.remove('active');
            aiView.classList.remove('hidden');
            simpleView.classList.add('hidden');
        });

        // Action Buttons
        document.getElementById('generateRawReportBtn')?.addEventListener('click', handleGenerateRawReport);
        document.getElementById('generateAITextBtn')?.addEventListener('click', handleGenerateAITextReport);
        document.getElementById('generateAIInfographicBtn')?.addEventListener('click', handleGenerateAIInfographic);
        document.getElementById('copyReportBtn')?.addEventListener('click', () => copyToClipboard('ai-output-text', 'copyReportBtn'));
        document.getElementById('downloadInfographicBtn')?.addEventListener('click', () => downloadInfographic('ai-output-infographic', 'downloadInfographicBtn'));
    }

    function populateReportUI() {
         const checkIconSVG = `<svg class="icon w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>`;
         const dragIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400 mr-2 flex-shrink-0"><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>`;
        
        const taskContainer = document.getElementById('report-task-list-container');
        let tasksHTML = '<div class="task-list-sortable-container border rounded-lg p-2 space-y-1 max-h-[35vh] overflow-y-auto">';
        Object.keys(taskDefinitions).forEach(catKey => {
            const catDef = taskDefinitions[catKey];
            const mainCheckboxId = `report-main-task-${catKey}`;
            tasksHTML += `
                <div class="report-main-task-container" draggable="true">
                    <input type="checkbox" id="${mainCheckboxId}" data-catkey="${catKey}" class="hidden report-main-task-checkbox">
                    <label for="${mainCheckboxId}" class="report-selection-label font-semibold">
                        ${dragIconSVG}
                        <span class="box">${checkIconSVG}</span>
                        <span>${catDef.reportEmoji} ${catDef.reportName}</span>
                    </label>
                    <div id="subtasks-${catKey}" class="hidden pl-12 space-y-1 mt-1">`;
            
            if (catDef.type === 'progress' || catDef.type === 'multi-progress') {
                 catDef.tasks.forEach((task, index) => {
                     const id = `report-subtask-${catKey}-${index}`;
                     tasksHTML += `<div><input type="checkbox" id="${id}" data-catkey="${catKey}" data-taskidx="${index}" class="hidden report-subtask-checkbox"><label for="${id}" class="report-selection-label text-sm"><span class="box">${checkIconSVG}</span><span>${task.name}</span></label></div>`;
                 });
            } else {
                const id = `report-subtask-${catKey}-summary`;
                tasksHTML += `<div><input type="checkbox" id="${id}" data-catkey="${catKey}" data-taskidx="0" class="hidden report-subtask-checkbox"><label for="${id}" class="report-selection-label text-sm"><span class="box">${checkIconSVG}</span><span>สรุปผลตรวจ</span></label></div>`;
            }

            tasksHTML += `</div></div>`;
        });
        tasksHTML += '</div>';
        taskContainer.innerHTML = tasksHTML;

        const floorContainer = document.getElementById('report-floor-list-container');
        let floorsHTML = '<div class="flex flex-wrap gap-2 p-2">';
        CONFIG.FLOORS.slice().reverse().forEach(floor => {
            const id = `report-floor-${floor}`;
            floorsHTML += `<div><input type="checkbox" id="${id}" value="${floor}" class="hidden report-floor-checkbox"><label for="${id}" class="floor-selector-btn">${floor}</label></div>`;
        });
        floorsHTML += '</div>';
        floorContainer.innerHTML = floorsHTML;
        
        const optionsContainer = document.getElementById('report-options-container');
        optionsContainer.innerHTML = `<div class="border rounded-lg p-3 space-y-2">
            <div>
                <input type="checkbox" id="report-include-summary" class="hidden">
                <label for="report-include-summary" class="report-selection-label">
                    <span class="box">${checkIconSVG}</span>
                    <span>แสดงภาพรวมทั้งโครงการ</span>
                </label>
            </div>
            <div class="pt-2">
                <p class="text-sm font-medium text-gray-700 mb-1 px-1">รูปแบบรายงาน:</p>
                <div class="report-toggle-container flex w-full bg-slate-200 rounded-full p-1">
                    <input type="radio" id="report-type-short" name="report-type" value="short" class="hidden">
                    <label for="report-type-short" class="flex-1 text-center py-1 rounded-full cursor-pointer transition-colors">แบบสั้น</label>
                    <input type="radio" id="report-type-long" name="report-type" value="long" class="hidden" checked>
                    <label for="report-type-long" class="flex-1 text-center py-1 rounded-full cursor-pointer transition-colors">แบบยาว</label>
                </div>
            </div>
            <div id="room-summary-option-container" class="border-t pt-3 mt-3 hidden">
                 <h4 class="font-semibold mb-2">สรุปคะแนนรายห้อง</h4>
                 <div>
                     <input type="checkbox" id="report-room-summary" class="hidden">
                     <label for="report-room-summary" class="report-selection-label">
                          <span class="box">${checkIconSVG}</span><span>แนบสรุปคะแนน</span>
                     </label>
                 </div>
                 <div class="pl-8 space-y-1 mt-1">
                     <div class="report-toggle-container flex w-full bg-slate-200 rounded-full p-1 text-sm">
                         <input type="radio" id="report-room-summary-type-cm" name="report-room-summary-type" value="CM" class="hidden" checked>
                         <label for="report-room-summary-type-cm" class="flex-1 text-center py-1 rounded-full cursor-pointer transition-colors">CM</label>
                         <input type="radio" id="report-room-summary-type-qc" name="report-room-summary-type" value="QC" class="hidden">
                         <label for="report-room-summary-type-qc" class="flex-1 text-center py-1 rounded-full cursor-pointer transition-colors">QC</label>
                     </div>
                 </div>
            </div>
        </div>`;
        
         // Fix: Cast elements to HTMLInputElement to access their properties correctly.
         document.querySelectorAll<HTMLInputElement>('.report-main-task-checkbox').forEach(checkbox => {
             checkbox.addEventListener('change', (e) => {
                 const catKey = (e.target as HTMLInputElement).dataset.catkey;
                 const subtasksDiv = document.getElementById(`subtasks-${catKey}`);
                 const subtaskCheckboxes = subtasksDiv.querySelectorAll<HTMLInputElement>('.report-subtask-checkbox');
                 if ((e.target as HTMLInputElement).checked) {
                     subtasksDiv.classList.remove('hidden');
                     subtaskCheckboxes.forEach(cb => cb.checked = true);
                 } else {
                     subtasksDiv.classList.add('hidden');
                     subtaskCheckboxes.forEach(cb => cb.checked = false);
                 }
                 updateRoomSummaryVisibility();
             });
         });

         document.getElementById('selectAllTasksBtn').addEventListener('click', () => document.querySelectorAll<HTMLInputElement>('.report-main-task-checkbox').forEach(cb => { if(!cb.checked) cb.click(); }));
         document.getElementById('deselectAllTasksBtn').addEventListener('click', () => document.querySelectorAll<HTMLInputElement>('.report-main-task-checkbox').forEach(cb => { if(cb.checked) cb.click(); }));
         document.getElementById('selectAllFloorsBtn').addEventListener('click', () => document.querySelectorAll<HTMLInputElement>('.report-floor-checkbox').forEach(cb => cb.checked = true));
         document.getElementById('deselectAllFloorsBtn').addEventListener('click', () => document.querySelectorAll<HTMLInputElement>('.report-floor-checkbox').forEach(cb => cb.checked = false));
        
         const sortableList = document.querySelector('.task-list-sortable-container');
         const draggables = sortableList.querySelectorAll('.report-main-task-container');

         draggables.forEach(draggable => {
             draggable.addEventListener('dragstart', () => draggable.classList.add('dragging'));
             draggable.addEventListener('dragend', () => draggable.classList.remove('dragging'));
         });

         // Fix: Type the event as DragEvent to access clientY.
         sortableList.addEventListener('dragover', (e: DragEvent) => {
             e.preventDefault();
             const afterElement = getDragAfterElement(sortableList, e.clientY);
             const draggingElement = document.querySelector('.dragging');
             if (draggingElement) {
                 if (afterElement == null) {
                     sortableList.appendChild(draggingElement);
                 } else {
                     sortableList.insertBefore(draggingElement, afterElement);
                 }
             }
         });
    }

    function updateRoomSummaryVisibility() {
        const container = document.getElementById('room-summary-option-container');
        // Fix: Cast elements to HTMLInputElement to access dataset.
        const isInspectionSelected = Array.from(document.querySelectorAll<HTMLInputElement>('.report-main-task-checkbox:checked'))
            .some(cb => taskDefinitions[cb.dataset.catkey].type === 'inspection');
        container.classList.toggle('hidden', !isInspectionSelected);
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.report-main-task-container:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            return (offset < 0 && offset > closest.offset) ? { offset, element: child } : closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    function calculateMultiProgressOverallStatus(categoryKey, floorsToCalc, selectedSubTaskIndexes) {
        let completedRooms = 0, inProgressRooms = 0, totalRooms = 0;
        const catDef = taskDefinitions[categoryKey];
        const relevantTaskKeys = selectedSubTaskIndexes.map(idx => catDef.tasks[idx].key);

        floorsToCalc.forEach(floor => {
            const roomsOnThisFloor = (floor === 2) ? CONFIG.ROOMS_ON_FLOOR_2 : CONFIG.ROOMS_PER_FLOOR;
            totalRooms += roomsOnThisFloor;
            for (let room = 1; room <= roomsOnThisFloor; room++) {
                const unitData = projectData[categoryKey][floor][room];
                let isRoomComplete = relevantTaskKeys.every(taskKey => (unitData[`progress_${taskKey}`] || 0) >= 100);
                let isRoomInProgress = !isRoomComplete && relevantTaskKeys.some(taskKey => (unitData[`progress_${taskKey}`] || 0) > 0);
                if (isRoomComplete) completedRooms++;
                else if (isRoomInProgress) inProgressRooms++;
            }
        });
        return { completedRooms, inProgressRooms, totalRooms };
    }

    function calculateMultiProgressOverallPercentage(categoryKey, floorsToCalc, selectedSubTaskIndexes) {
        let totalProgress = 0, totalUnitsInvolved = 0;
        const catDef = taskDefinitions[categoryKey];
        const relevantTaskKeys = selectedSubTaskIndexes.map(idx => catDef.tasks[idx].key);

        floorsToCalc.forEach(floor => {
            const roomsOnThisFloor = (floor === 2) ? CONFIG.ROOMS_ON_FLOOR_2 : CONFIG.ROOMS_PER_FLOOR;
            totalUnitsInvolved += roomsOnThisFloor;
            for (let room = 1; room <= roomsOnThisFloor; room++) {
                let roomTotalProgress = relevantTaskKeys.reduce((sum, taskKey) => sum + (projectData[categoryKey][floor][room][`progress_${taskKey}`] || 0), 0);
                totalProgress += roomTotalProgress / relevantTaskKeys.length;
            }
        });
        const maxProgress = totalUnitsInvolved * 100;
        return maxProgress > 0 ? (totalProgress / maxProgress) * 100 : 0;
    }

    function calculateSubTaskProgress(categoryKey, subTaskIndex, floorsToCalc) {
        let totalProgress = 0, totalUnitsInvolved = 0;
        const catDef = taskDefinitions[categoryKey];

        floorsToCalc.forEach(floor => {
            const roomsOnThisFloor = (floor === 2) ? CONFIG.ROOMS_ON_FLOOR_2 : CONFIG.ROOMS_PER_FLOOR;
            totalUnitsInvolved += roomsOnThisFloor;
            for (let room = 1; room <= roomsOnThisFloor; room++) {
                const unitData = projectData[categoryKey][floor][room];
                if (catDef.type === 'multi-progress') {
                    const taskKey = catDef.tasks[subTaskIndex].key;
                    totalProgress += unitData[`progress_${taskKey}`] || 0;
                } else {
                    if (unitData.taskIndex > subTaskIndex) totalProgress += 100;
                    else if (unitData.taskIndex === subTaskIndex) totalProgress += unitData.progress;
                }
            }
        });
        const maxProgress = totalUnitsInvolved * 100;
        return maxProgress > 0 ? (totalProgress / maxProgress) * 100 : 0;
    }

    function calculateSubTaskStatusCounts(categoryKey, subTaskIndex, floorsToCalc) {
        let completedRooms = 0, inProgressRooms = 0, totalRooms = 0;
        const catDef = taskDefinitions[categoryKey];

        floorsToCalc.forEach(floor => {
            const roomsOnThisFloor = (floor === 2) ? CONFIG.ROOMS_ON_FLOOR_2 : CONFIG.ROOMS_PER_FLOOR;
            totalRooms += roomsOnThisFloor;
            for (let room = 1; room <= roomsOnThisFloor; room++) {
                const unitData = projectData[categoryKey][floor][room];
                let isCompleted, isInProgress;
                if (catDef.type === 'multi-progress') {
                    const progress = unitData[`progress_${catDef.tasks[subTaskIndex].key}`] || 0;
                    isCompleted = progress >= 100;
                    isInProgress = progress > 0 && progress < 100;
                } else {
                    isCompleted = (unitData.taskIndex > subTaskIndex) || (unitData.taskIndex === subTaskIndex && unitData.progress >= 100);
                    isInProgress = (unitData.taskIndex === subTaskIndex && unitData.progress > 0 && unitData.progress < 100);
                }
                if(isCompleted) completedRooms++;
                else if (isInProgress) inProgressRooms++;
            }
        });
        return { completedRooms, inProgressRooms, totalRooms };
    }
    
    function calculateInspectionStats(categoryKey, stage, floorsToCalc) {
        let submitted = 0, passed_clean = 0, passed_defect = 0, failed_clean = 0, failed_defect = 0;
        let totalRooms = 0;
        const scoreField = stage === 'CM' ? 'cmScore' : 'qcScore';
        const defectField = stage === 'CM' ? 'cmHasMajorDefect' : 'qcHasMajorDefect';
         floorsToCalc.forEach(floor => {
            const roomsOnThisFloor = (floor === 2) ? CONFIG.ROOMS_ON_FLOOR_2 : CONFIG.ROOMS_PER_FLOOR;
            totalRooms += roomsOnThisFloor;
            for (let room = 1; room <= roomsOnThisFloor; room++) {
                const unitData = projectData[categoryKey][floor][room];
                if (unitData[scoreField] > 0) {
                    submitted++;
                    if (unitData[scoreField] >= 85) {
                        if (unitData[defectField]) passed_defect++; else passed_clean++;
                    } else {
                        if (unitData[defectField]) failed_defect++; else failed_clean++;
                    }
                }
            }
         });
        return { submitted, passed_clean, passed_defect, failed_clean, failed_defect, totalRooms };
    }

    async function runAIAnalysis(request, renderer) {
        if (!genAI) {
            showNotificationModal("AI ไม่พร้อมใช้งาน", "ไม่สามารถเริ่มต้น Gemini AI client ได้ กรุณาตรวจสอบการตั้งค่า API Key");
            return;
        }

        const loadingOverlay = document.getElementById('ai-loading-overlay') as HTMLElement;
        loadingOverlay.style.display = 'flex';
        (document.getElementById('ai-output-text') as HTMLTextAreaElement).value = "AI กำลังประมวลผล...";
        document.getElementById('ai-output-infographic').innerHTML = '';
        
        try {
            const response = await genAI.models.generateContent(request);
            renderer(response.text);
        } catch (error) {
            console.error("AI Analysis Error:", error);
            const errorMessage = `เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI: ${(error as Error).message}`;
            showNotificationModal('AI Error', errorMessage);
            (document.getElementById('ai-output-text') as HTMLTextAreaElement).value = errorMessage;
            switchToTextView();
        } finally {
            loadingOverlay.style.display = 'none';
        }
    }

    function switchToTextView() {
        document.getElementById('ai-output-text').classList.remove('hidden');
        document.getElementById('ai-output-infographic').classList.add('hidden');
        document.getElementById('copyReportBtn').classList.remove('hidden');
        document.getElementById('downloadInfographicBtn').classList.add('hidden');
    }

    function switchToInfographicView() {
        document.getElementById('ai-output-text').classList.add('hidden');
        document.getElementById('ai-output-infographic').classList.remove('hidden');
        document.getElementById('copyReportBtn').classList.add('hidden');
        document.getElementById('downloadInfographicBtn').classList.remove('hidden');
    }
    
    function handleGenerateRawReport() {
        const rawReportText = (currentView === 'common') ? prepareCommonAreaReportText() : prepareRawReportText();
        if(rawReportText) {
            switchToTextView();
            (document.getElementById('ai-output-text') as HTMLTextAreaElement).value = rawReportText.replace(/\*/g, ''); 
            showToast("สร้างรายงานสำเร็จ");
        }
    }

    function handleGenerateAITextReport() {
        const rawReportText = (currentView === 'common') ? prepareCommonAreaReportText() : prepareRawReportText();
        if (!rawReportText) return;

        switchToTextView();
        const request = {
            model: CONFIG.GEMINI_API_MODEL,
            contents: rawReportText,
            config: {
                systemInstruction: "คุณคือผู้จัดการโครงการที่ต้องรายงานความคืบหน้าในกลุ่ม LINE จงสรุปข้อมูลต่อไปนี้ให้กระชับ ชัดเจน ห้ามใช้ Markdown formatting เช่น `**` หรือ `*` และห้ามลงท้ายด้วย 'ครับ' หรือ 'ค่ะ' แต่ให้ใช้ emoji ช่วยเน้นประเด็นสำคัญ และจัดรูปแบบให้อ่านง่ายในแอปพลิเคชันแชท"
            }
        };
        runAIAnalysis(request, (text) => {
            (document.getElementById('ai-output-text') as HTMLTextAreaElement).value = text;
        });
    }

    function handleGenerateAIInfographic() {
        const rawReportText = (currentView === 'common') ? prepareCommonAreaReportText() : prepareRawReportText();
        if (!rawReportText) return;

        switchToInfographicView();
        const today = new Date();
        const dateString = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear() + 543}`;
        
        const request = {
            model: CONFIG.GEMINI_API_MODEL,
            contents: `จากข้อมูลรายงานความคืบหน้าโครงการ Vay Chinnakhet:\n---\n${rawReportText}\n---`,
            config: {
                systemInstruction: "คุณคือผู้ช่วยวิเคราะห์โครงการก่อสร้างมืออาชีพ หน้าที่ของคุณคือแปลงข้อมูลความคืบหน้าดิบให้เป็นข้อมูลสรุปสำหรับ Infographic ตาม schema ที่กำหนดอย่างเคร่งครัด โดยวิเคราะห์หาประเด็นสำคัญในแต่ละหัวข้อ: งานที่คืบหน้าดี, จุดที่ต้องให้ความสำคัญ, และแผนงาน/ข้อเสนอแนะที่นำไปปฏิบัติได้จริง",
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        infographicData: {
                            type: Type.OBJECT,
                            properties: {
                                reportTitle: { type: Type.STRING, description: "ชื่อรายงานสรุปที่เหมาะสมกับงานที่เลือก เช่น 'สรุปความคืบหน้างานสกิมและทาสี'" },
                                reportDate: { type: Type.STRING, description: `วันที่ของรายงาน, คือ '${dateString}'` },
                                executiveSummary: { type: Type.STRING, description: "สรุปภาพรวมทั้งหมด 1-2 ประโยคที่กระชับที่สุด" },
                                overallProgress: { type: Type.NUMBER, description: "คำนวณค่าเฉลี่ยความคืบหน้าของ 'ทุกงานที่เลือก' รวมกันเป็นตัวเลข 0-100" },
                                keyMetrics: { 
                                    type: Type.ARRAY, 
                                    description: "สร้าง Key Metrics ที่สำคัญ 4 อย่างจากข้อมูลที่ให้มา",
                                    items: { 
                                        type: Type.OBJECT, 
                                        properties: { 
                                            label: { type: Type.STRING }, 
                                            value: { type: Type.STRING }
                                        } 
                                    } 
                                },
                                progressingWell: { type: Type.ARRAY, items: { type: Type.STRING }, description: "ลิสต์ของงานหรือพื้นที่ที่คืบหน้าได้ดี" },
                                areasOfConcern: { type: Type.ARRAY, items: { type: Type.STRING }, description: "ลิสต์ของปัญหาหรือความเสี่ยงที่สำคัญที่ต้องให้ความสนใจ" },
                                recommendations: { type: Type.ARRAY, items: { type: Type.STRING }, description: "ลิสต์ของแผนงานหรือข้อเสนอแนะที่ควรทำต่อไป" }
                            }
                        }
                    }
                }
            }
        };

        runAIAnalysis(request, (jsonText) => {
            try {
                const aiData = JSON.parse(jsonText);
                renderResidentialInfographic(aiData.infographicData);
            } catch (e) {
                console.error("Failed to parse AI JSON response:", e);
                switchToTextView();
                (document.getElementById('ai-output-text') as HTMLTextAreaElement).value = `เกิดข้อผิดพลาดในการอ่านข้อมูลจาก AI: ${(e as Error).message}\n\n${jsonText}`;
            }
        });
    }
    
    function getReportSelections() {
        const selections = {
            orderedTaskKeys: [],
            tasks: {},
            // Fix: Cast elements to access their values correctly.
            floors: Array.from(document.querySelectorAll<HTMLInputElement>('.report-floor-checkbox:checked')).map(el => parseInt(el.value, 10)),
            includeSummary: (document.getElementById('report-include-summary') as HTMLInputElement).checked,
            reportType: (document.querySelector('input[name="report-type"]:checked') as HTMLInputElement).value,
            includeRoomSummary: (document.getElementById('report-room-summary') as HTMLInputElement)?.checked || false,
            roomSummaryType: (document.querySelector('input[name="report-room-summary-type"]:checked') as HTMLInputElement)?.value || 'CM',
        };

        // Fix: Use querySelectorAll with the correct type.
        document.querySelectorAll<HTMLElement>('.report-main-task-container').forEach(container => {
            const mainCheckbox = container.querySelector<HTMLInputElement>('.report-main-task-checkbox');
            if (mainCheckbox && mainCheckbox.checked) {
                const catKey = mainCheckbox.dataset.catkey;
                selections.orderedTaskKeys.push(catKey);
                const subtasksDiv = document.getElementById(`subtasks-${catKey}`);
                selections.tasks[catKey] = Array.from(subtasksDiv.querySelectorAll<HTMLInputElement>('.report-subtask-checkbox:checked')).map(sub => parseInt(sub.dataset.taskidx, 10));
            }
        });
        
        selections.floors.sort((a,b) => a - b);
        return selections;
    }

    function prepareRawReportText() {
        const selections = getReportSelections();
        const { orderedTaskKeys, tasks, floors, includeSummary, reportType, includeRoomSummary, roomSummaryType } = selections;
        
        if (orderedTaskKeys.length === 0 || (!floors.length && !includeSummary)) {
            showNotificationModal('ข้อมูลไม่เพียงพอ', "กรุณาเลือก 'งาน' และ 'ชั้น' (หรือ 'ภาพรวมทั้งโครงการ') ที่ต้องการสรุปเป็นอย่างน้อย");
            return null;
        }
        
        const today = new Date();
        const dateString = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear() + 543}`;
        let report = `📋 รายงานความก้าวหน้าโครงการ Vay Chinnakhet\n`;
        report += `🗓️ ประจำวันที่ ${dateString}\n`;
        
        const processCategory = (catKey, floorsToCalc, isSummary) => {
            const catDef = taskDefinitions[catKey];
            let categorySection = `\n${catDef.reportEmoji} ${catDef.reportName}\n`;
            if (catDef.type === 'inspection') {
                const total = isSummary ? CONFIG.TOTAL_UNITS : floorsToCalc.reduce((acc, f) => acc + ((f===2) ? CONFIG.ROOMS_ON_FLOOR_2 : CONFIG.ROOMS_PER_FLOOR), 0);
                ['CM', 'QC'].forEach(stage => {
                     const stats = calculateInspectionStats(catKey, stage, floorsToCalc);
                     const passed_total = stats.passed_clean + stats.passed_defect;
                     const failed_total = stats.failed_clean + stats.failed_defect;
                     categorySection += `  **${stage}**:\n`;
                     categorySection += `     • ส่งตรวจแล้ว: ${stats.submitted}/${total} ห้อง\n`;
                     categorySection += `     • ผลการตรวจ:\n`;
                     categorySection += `       - ผ่าน: ${passed_total} ห้อง (พบ Major Defect: ${stats.passed_defect} ห้อง)\n`;
                     categorySection += `       - ไม่ผ่าน: ${failed_total} ห้อง (พบ Major Defect: ${stats.failed_defect} ห้อง)\n`;
                });
            } else if (catDef.type === 'multi-progress') {
                const overallProgress = calculateMultiProgressOverallPercentage(catKey, floorsToCalc, tasks[catKey]);
                const stats = calculateMultiProgressOverallStatus(catKey, floorsToCalc, tasks[catKey]);
                const total = isSummary ? CONFIG.TOTAL_UNITS : stats.totalRooms;
                let line = `- ภาพรวม: แล้วเสร็จ ${overallProgress.toFixed(1)}%`;
                if (reportType === 'long') {
                    line += `\n  • ดำเนินการแล้วเสร็จ: ${stats.completedRooms}/${total} ห้อง`;
                    if (stats.inProgressRooms > 0) line += `\n  • อยู่ระหว่างดำเนินการ: ${stats.inProgressRooms} ห้อง`;
                }
                categorySection += line + '\n';
            } else {
                tasks[catKey].sort((a,b) => a-b).forEach(taskIdx => {
                    const progress = calculateSubTaskProgress(catKey, taskIdx, floorsToCalc);
                    const taskName = catDef.tasks[taskIdx].name;
                    let line = `- ${taskName}: แล้วเสร็จ ${progress.toFixed(1)}%`;
                    if (reportType === 'long') {
                        const stats = calculateSubTaskStatusCounts(catKey, taskIdx, floorsToCalc);
                        const total = isSummary ? CONFIG.TOTAL_UNITS : stats.totalRooms;
                        line += `\n  • ดำเนินการแล้วเสร็จ: ${stats.completedRooms}/${total} ห้อง`;
                        if (stats.inProgressRooms > 0) line += `\n  • อยู่ระหว่างดำเนินการ: ${stats.inProgressRooms} ห้อง`;
                    }
                    categorySection += line + '\n';
                });
            }
            return categorySection;
        };

        if (floors.length) {
            floors.forEach(floor => {
                report += `\n------------------------------------\n`;
                report += `\n🏢 สรุปความคืบหน้า ชั้น ${floor}`;
                orderedTaskKeys.forEach(catKey => {
                    if(tasks[catKey] && tasks[catKey].length > 0) report += processCategory(catKey, [floor], false);
                });
            });
        }

        if (includeSummary) {
            report += `\n------------------------------------\n`;
            report += `\n📊 สรุปภาพรวมความก้าวหน้าทั้งโครงการ`;
            orderedTaskKeys.forEach(catKey => {
                 if(tasks[catKey] && tasks[catKey].length > 0) report += processCategory(catKey, CONFIG.FLOORS, true);
            });
        }
        
        if (includeRoomSummary && floors.length) {
              report += `\n\n------------------------------------\n`;
              report += `\n📋 สรุปคะแนนรายห้อง (${roomSummaryType})\n`;
               orderedTaskKeys.forEach(catKey => {
                   const catDef = taskDefinitions[catKey];
                   if (catDef.type === 'inspection' && tasks[catKey] && tasks[catKey].length > 0) {
                       report += `\n${catDef.reportEmoji} ${catDef.reportName}\n`;
                       floors.forEach(floor => {
                           report += `  --- ชั้น ${floor} ---\n`;
                           const roomsOnThisFloor = (floor === 2) ? CONFIG.ROOMS_ON_FLOOR_2 : CONFIG.ROOMS_PER_FLOOR;
                           for (let room = 1; room <= roomsOnThisFloor; room++) {
                               const roomNumber = `${floor}${String(room).padStart(2, '0')}`;
                               const unitData = projectData[catKey][floor][room];
                               const score = (roomSummaryType === 'CM') ? unitData.cmScore : unitData.qcScore;
                               
                               if (score > 0) {
                                   const defect = (roomSummaryType === 'CM') ? unitData.cmHasMajorDefect : unitData.qcHasMajorDefect;
                                   const status = score >= 85 ? 'ผ่าน' : 'ไม่ผ่าน';
                                   const defectText = defect ? ' [พบ Major Defect]' : '';
                                    report += `    ห้อง ${roomNumber}: ${status} (${score.toFixed(2)})${defectText}\n`;
                               }
                           }
                       });
                   }
               });
        }

        return report.trim();
    }

    function prepareCommonAreaReportText() {
        let report = 'ข้อมูลสรุปงานพื้นที่ส่วนกลาง:\n';
        Object.keys(commonAreaDefinitions).forEach(locKey => {
            const locDef = commonAreaDefinitions[locKey];
            report += `\n- พื้นที่: ${locDef.locationName}\n`;
            locDef.tasks.forEach((task, taskIndex) => {
                report += `  - งาน: ${task.taskName}\n`;
                const taskData = projectData.commonArea[locKey].tasks[taskIndex];
                let floorProgress = [];
                CONFIG.COMMON_AREA_FLOORS.forEach(floor => {
                    const progress = taskData.progress[floor] || 0;
                    if (progress > 0) {
                        floorProgress.push(`ชั้น ${floor}: ${progress}%`);
                    }
                });
                if (floorProgress.length > 0) {
                     report += `    - ความคืบหน้า: ${floorProgress.join(', ')}\n`;
                } else {
                     report += `    - ความคืบหน้า: ยังไม่เริ่ม\n`;
                }
            });
        });
        return report.trim();
    }

    function setupAndOpenCommonAreaReportModal() {
        const rawText = prepareCommonAreaReportText();
        const today = new Date();
        const dateString = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear() + 543}`;

        const request = {
            model: CONFIG.GEMINI_API_MODEL,
            contents: `วิเคราะห์และสรุปข้อมูลความคืบหน้าของงานพื้นที่ส่วนกลางโครงการ Vay Chinnakhet:\n---\n${rawText}\n---`,
            config: {
                systemInstruction: "คุณคือผู้จัดการโครงการก่อสร้างมืออาชีพ (Project Manager) ที่มีทักษะการวิเคราะห์และสื่อสารเป็นเลิศ หน้าที่ของคุณคือแปลงข้อมูลดิบเกี่ยวกับความคืบหน้าของงานพื้นที่ส่วนกลาง ซึ่งมีโครงสร้างเป็น 'พื้นที่ -> งาน -> ชั้น' ให้เป็น Infographic สรุปรายชั้นที่สวยงามและเข้าใจง่าย โดยต้องตอบกลับเป็น JSON object ที่ถูกต้องตาม schema ที่กำหนดเท่านั้น",
                responseMimeType: "application/json",
                responseSchema: { type: Type.OBJECT, properties: { infographicData: { type: Type.OBJECT, properties: { reportDate: { type: Type.STRING, description: `วันที่ของรายงาน, คือ '${dateString}'` }, executiveSummary: { type: Type.STRING, description: "สรุปภาพรวมทั้งหมดของพื้นที่ส่วนกลาง 1-2 ประโยคที่กระชับที่สุด" }, overallProgress: { type: Type.NUMBER, description: "คำนวณค่าเฉลี่ยความคืบหน้าของ 'ทุกงาน' ใน 'ทุกพื้นที่' และ 'ทุกชั้น' รวมกันเป็นตัวเลข 0-100" }, floorDetails: { type: Type.ARRAY, description: "อาร์เรย์ของข้อมูลสรุปสำหรับแต่ละชั้น ตั้งแต่ชั้น 2 ถึง 8", items: { type: Type.OBJECT, properties: { floor: { type: Type.NUMBER, description: "หมายเลขชั้น (2, 3, ..., 8)"}, floorProgress: { type: Type.NUMBER, description: "คำนวณค่าเฉลี่ยความคืบหน้าของ 'ทุกงาน' ใน 'ทุกพื้นที่' เฉพาะของชั้นนี้ เป็นตัวเลข 0-100"}, completedTasks: { type: Type.ARRAY, items: {type: Type.STRING}, description: "ลิสต์ของงานที่เสร็จสมบูรณ์ 100% ในชั้นนี้ รูปแบบ 'ชื่องาน - ชื่อพื้นที่' (เช่น 'ราวบันได - บันได ST1')"}, inProgressTasks: { type: Type.ARRAY, items: {type: Type.STRING}, description: "ลิสต์ของงานที่กำลังดำเนินการ (1-99%) ในชั้นนี้ รูปแบบ 'ชื่องาน - ชื่อพื้นที่'"}, notes: { type: Type.STRING, description: "สรุปสั้นๆ ที่น่าสนใจเกี่ยวกับความคืบหน้าของชั้นนี้ (เช่น 'งานส่วนใหญ่ในชั้นนี้เสร็จสิ้นแล้ว เหลือเพียงเก็บรายละเอียดเล็กน้อย')"} } } } } } } }
            }
        };
        
        document.getElementById('report-modal-title').textContent = 'สร้าง Infographic พื้นที่ส่วนกลาง';
        const reportContentArea = document.getElementById('report-content-area');
        reportContentArea.innerHTML = `<div class="xl:col-span-3 flex flex-col min-h-0">
             <div class="relative flex-grow min-h-0">
                <div id="ai-loading-overlay" class="absolute inset-0 items-center justify-center hidden rounded-lg">
                    <div class="text-center p-4 bg-white/80 rounded-lg shadow-md">
                        <div class="spinner mx-auto"></div><p class="mt-2 font-semibold text-indigo-700">AI กำลังสร้าง Infographic...</p>
                    </div>
                </div>
                <div id="infographic-output" class="w-full h-full p-4 border rounded-lg bg-slate-50 overflow-y-auto bg-white shadow"></div>
             </div>
             <div class="flex-shrink-0 flex gap-2 mt-2">
                  <button id="downloadInfographicBtn" class="flex-grow p-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors inline-flex items-center justify-center gap-2" title="ดาวน์โหลด Infographic เป็นภาพ">
                     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line></svg>
                     <span>ดาวน์โหลดภาพ</span>
                  </button>
            </div>
        </div>`;

        document.getElementById('downloadInfographicBtn').addEventListener('click', () => downloadInfographic('infographic-output', 'downloadInfographicBtn'));
        openModal('reportModal');
        runAIAnalysis(request, (jsonText) => {
            try {
                const aiData = JSON.parse(jsonText);
                renderCommonAreaInfographic(aiData.infographicData);
            } catch (e) {
                console.error("Failed to parse AI JSON response:", e);
                document.getElementById('infographic-output').innerHTML = `<p class="text-red-500">เกิดข้อผิดพลาดในการอ่านข้อมูลจาก AI</p>`;
            }
        });
    }

    function renderCommonAreaInfographic(data) {
        const container = document.getElementById('infographic-output');
        if (!data) {
            container.innerHTML = `<p class="text-center text-gray-500">ไม่พบข้อมูลสำหรับสร้าง Infographic</p>`;
            return;
        }

        const renderTaskList = (tasks, icon, colorClass) => {
            if (!tasks || tasks.length === 0) return '<p class="text-sm text-gray-500">ไม่มี</p>';
            return `<ul class="space-y-2">${tasks.map(item => `<li class="flex items-start gap-2 text-sm"><span class="flex-shrink-0 mt-1 ${colorClass}">${icon}</span><span>${item}</span></li>`).join('')}</ul>`;
        };

        const floorDetailsHTML = data.floorDetails.map(floor => `
            <div class="bg-slate-50 p-4 rounded-lg border">
                <div class="flex justify-between items-center mb-3">
                    <h4 class="text-lg font-bold text-slate-800">ชั้น ${floor.floor}</h4>
                    <p class="font-bold text-amber-600">${floor.floorProgress.toFixed(0)}%</p>
                </div>
                <div class="progress-bar-container w-full h-2 mb-4">
                    <div class="progress-bar h-2 rounded-full bg-amber-500" style="width: ${floor.floorProgress}%"></div>
                </div>
                <p class="text-sm text-gray-600 mb-3 italic">"${floor.notes}"</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <h5 class="font-semibold mb-2 text-green-600">งานที่เสร็จแล้ว</h5>
                        ${renderTaskList(floor.completedTasks, '✅', 'text-green-500')}
                    </div>
                    <div>
                        <h5 class="font-semibold mb-2 text-blue-600">งานที่กำลังทำ</h5>
                        ${renderTaskList(floor.inProgressTasks, '⏳', 'text-blue-500')}
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="space-y-6 p-4 md:p-6">
                <div class="text-center">
                    <h2 class="text-2xl font-bold text-gray-800">Vay Chinnakhet</h2>
                    <p class="text-lg text-gray-500">Infographic พื้นที่ส่วนกลาง</p>
                    <p class="font-semibold text-emerald-600">🗓️ ประจำวันที่: ${data.reportDate}</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div class="md:col-span-2">
                        <h3 class="font-bold text-lg mb-2">✨ สรุปภาพรวม</h3>
                        <p class="text-gray-700">${data.executiveSummary}</p>
                    </div>
                    <div class="flex flex-col items-center">
                        <div class="infographic-progress-circle w-32 h-32 rounded-full flex items-center justify-center" style="--progress: ${data.overallProgress}%">
                            <span class="text-3xl font-bold text-gray-800">${data.overallProgress.toFixed(0)}%</span>
                        </div>
                        <p class="mt-2 font-semibold text-gray-600">ความคืบหน้าโดยรวม</p>
                    </div>
                </div>
                <div>
                     <h3 class="font-bold text-lg text-slate-800 border-b-2 border-slate-200 pb-1 mb-4">ความคืบหน้ารายชั้น</h3>
                     <div class="space-y-4">${floorDetailsHTML}</div>
                </div>
            </div>`;
    }

    function renderResidentialInfographic(data) {
        const container = document.getElementById('ai-output-infographic');
        if (!data) {
            container.innerHTML = `<p class="text-center text-gray-500">ไม่พบข้อมูลสำหรับสร้าง Infographic</p>`;
            return;
        }
        
        const keyMetricsHTML = (data.keyMetrics || []).map(metric => `
            <div class="bg-slate-50 p-3 rounded-lg text-center border">
                <p class="text-sm text-gray-500">${metric.label}</p>
                <p class="text-2xl font-bold text-gray-800">${metric.value}</p>
            </div>
        `).join('');

        const iconMap = {
            well: `<svg class="w-5 h-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>`,
            concern: `<svg class="w-5 h-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 100-2 1 1 0 000 2zm-1-8a1 1 0 011-1h.008a1 1 0 011 1v3.008a1 1 0 01-1 1H9a1 1 0 01-1-1V5z" clip-rule="evenodd" /></svg>`,
            plan: `<svg class="w-5 h-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M7.5 3A4.5 4.5 0 003 7.5v6A4.5 4.5 0 007.5 18h5A4.5 4.5 0 0017 13.5v-6A4.5 4.5 0 0012.5 3h-5zM4 7.5A3.5 3.5 0 017.5 4h5A3.5 3.5 0 0116 7.5v6A3.5 3.5 0 0112.5 17h-5A3.5 3.5 0 014 13.5v-6zM8 8a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zm0 4a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" /></svg>`
        }
        const createList = (items, icon) => (items || []).map(item => `<li class="flex items-start gap-3"><span class="flex-shrink-0 mt-1">${icon}</span><p class="text-gray-700">${item}</p></li>`).join('');

        container.innerHTML = `
            <div class="p-2 sm:p-4 bg-white font-sans">
                <div class="border rounded-lg p-4 sm:p-6 space-y-6">
                    <!-- Header -->
                    <div class="text-center">
                        <h2 class="text-xl sm:text-2xl font-bold text-gray-800">Vay Chinnakhet</h2>
                        <p class="text-gray-500">${data.reportTitle}</p>
                        <p class="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 bg-blue-100 px-3 py-1 rounded-full mt-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" /></svg>
                            ประจำวันที่: ${data.reportDate}
                        </p>
                    </div>

                    <!-- Summary & Overall Progress -->
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                        <div class="lg:col-span-2 space-y-2">
                            <h3 class="font-bold text-lg inline-flex items-center gap-2">
                               <span class="bg-yellow-100 p-1.5 rounded-full">✨</span>
                               <span>สรุปภาพรวม</span>
                            </h3>
                            <p class="text-gray-600">${data.executiveSummary}</p>
                        </div>
                        <div class="flex flex-col items-center justify-center">
                            <div class="infographic-progress-circle w-36 h-36 rounded-full flex items-center justify-center shadow-inner" style="--progress: ${data.overallProgress}%">
                                <div>
                                    <span class="text-4xl font-bold text-gray-800">${data.overallProgress.toFixed(1)}%</span>
                                    <p class="text-xs text-gray-500 text-center -mt-1">ความคืบหน้าโดยรวม</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Key Metrics -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">${keyMetricsHTML}</div>

                    <!-- Details Grid -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8 pt-4">
                        <!-- Progressing Well -->
                        <div class="space-y-3">
                            <h3 class="font-bold text-lg border-b-2 border-green-200 pb-2 inline-flex items-center gap-2">
                                <svg class="w-6 h-6 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.5a1.5 1.5 0 011.5 1.5v2.879a1.5 1.5 0 01.44 1.06l.002.004.001.004c.063.26.18.506.33.731l.003.005.003.005a1.5 1.5 0 01-2.483 1.815l-.004-.002-.004-.003a2.984 2.984 0 00-.41-1.332l-.003-.005-.003-.005A1.5 1.5 0 018 9.942V5A1.5 1.5 0 019.5 3.5h.5zM13 5a1.5 1.5 0 011.5 1.5v4.563a1.5 1.5 0 01-1.026 1.416l-.003.001-.003.001c-.328.163-.68.293-1.04.385l-.004.001-.004.001a1.5 1.5 0 01-1.85-1.477l.001-.003.001-.003a2.951 2.951 0 001.09-1.93l.003-.005.003-.005A1.5 1.5 0 0113 9.437V5z" /></svg>
                                งานที่คืบหน้าได้ดี
                            </h3>
                            <ul class="space-y-3">${createList(data.progressingWell, iconMap.well)}</ul>
                        </div>
                        
                        <!-- Areas of Concern -->
                        <div class="space-y-3">
                            <h3 class="font-bold text-lg border-b-2 border-red-200 pb-2 inline-flex items-center gap-2">
                                 <svg class="w-6 h-6 text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 1a9 9 0 100 18 9 9 0 000-18zM9 4a1 1 0 112 0v1a1 1 0 11-2 0V4zm3 8a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1z" clip-rule="evenodd" /></svg>
                                จุดที่ต้องให้ความสำคัญ
                            </h3>
                            <ul class="space-y-3">${createList(data.areasOfConcern, iconMap.concern)}</ul>
                        </div>
                    </div>
                     <!-- Plan & Recommendations -->
                    <div class="space-y-3 pt-4 bg-slate-50 p-4 rounded-lg border">
                        <h3 class="font-bold text-lg inline-flex items-center gap-2">
                            <svg class="w-6 h-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M11.983 1.904a.75.75 0 00-1.292-.748L4.319 9.923a.75.75 0 000 .748l6.372 8.767a.75.75 0 001.292-.748L6.47 10.297l5.513-8.393z" /></svg>
                            แผนงานและข้อเสนอแนะ
                        </h3>
                        <ul class="space-y-3">${createList(data.recommendations, iconMap.plan)}</ul>
                    </div>
                </div>
            </div>
        `;
    }

    function downloadInfographic(elementId, buttonId) {
        const infographicElement = document.getElementById(elementId);
        // Fix: Cast element to HTMLButtonElement.
        const downloadBtn = document.getElementById(buttonId) as HTMLButtonElement;
        if (!infographicElement || infographicElement.children.length === 0 || infographicElement.querySelector('p.text-gray-500')) {
             showNotificationModal('ไม่สำเร็จ', 'ไม่พบข้อมูล Infographic ที่จะดาวน์โหลด');
            return;
        }
        
        const originalContent = downloadBtn.innerHTML;
        downloadBtn.innerHTML = 'กำลังเตรียม...';
        downloadBtn.disabled = true;

        // Fix: html2canvas is now declared as a global variable.
        html2canvas(infographicElement.querySelector(':first-child'), { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
        .then(canvas => {
            const link = document.createElement('a');
            link.download = `infographic-report-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }).catch(err => {
            console.error('Infographic capture failed:', err);
            showNotificationModal('เกิดข้อผิดพลาด', 'ไม่สามารถสร้างไฟล์ภาพได้');
        }).finally(() => {
            downloadBtn.innerHTML = originalContent;
            downloadBtn.disabled = false;
        });
    }
    
    function copyToClipboard(textareaId, buttonId) {
        // Fix: Cast elements to their specific types.
        const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
        const button = document.getElementById(buttonId) as HTMLButtonElement;
        if (!textarea.value || (button && button.disabled)) return;

        const showSuccess = () => {
            const originalContent = button.innerHTML;
            button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-500"><path d="M20 6 9 17l-5-5"></path></svg> <span>คัดลอกแล้ว!</span>`;
            button.disabled = true;
            setTimeout(() => {
                button.innerHTML = originalContent;
                button.disabled = false;
            }, 2000);
        };

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(textarea.value).catch(() => showToast('ไม่สามารถคัดลอกได้'));
            showSuccess();
        } else {
            try {
                textarea.select();
                document.execCommand('copy');
                showSuccess();
            } catch (err) {
                showToast('ไม่สามารถคัดลอกได้');
            }
        }
    }
    
    function clearSelection() {
        // Fix: Cell is an HTMLElement, classList is accessible.
        selectedCells.forEach(cell => cell.classList.remove('selection-active'));
        selectedCells.clear();
    }

    function bindEventListeners() {
        let clearDataConfirmationStep = 0;

        document.getElementById('closeModalBtn').addEventListener('click', () => closeModal('updateModal'));
        document.getElementById('saveProgressBtn').addEventListener('click', saveProgress);
        
        document.getElementById('clearDataBtn').addEventListener('click', () => {
            const CONFIRM_COUNT = 5;
            
            const executeClear = async () => {
                const initialData = generateInitialDataObject();
                try {
                    const { error } = await supabaseClient
                        .from(CONFIG.DB_TABLE_NAME)
                        .update({ data: initialData })
                        .eq('id', CONFIG.DB_ROW_ID);
                    if (error) throw error;
                    showToast("รีเซ็ตข้อมูลบนเซิร์ฟเวอร์แล้ว");
                } catch (err) {
                    console.error("Error resetting data:", err);
                    showNotificationModal("เกิดข้อผิดพลาด", "ไม่สามารถรีเซ็ตข้อมูลได้");
                } finally {
                    closeModal('confirmModal');
                    clearDataConfirmationStep = 0;
                }
            };

            const askForConfirmation = () => {
                clearDataConfirmationStep++;
                if (clearDataConfirmationStep > CONFIRM_COUNT) {
                    executeClear();
                } else {
                    let message = `นี่คือการยืนยันครั้งที่ ${clearDataConfirmationStep} จาก ${CONFIRM_COUNT} คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลทั้งหมด?`;
                    if (clearDataConfirmationStep === CONFIRM_COUNT) {
                        message = `นี่คือการยืนยันครั้งสุดท้าย! การกระทำนี้ไม่สามารถย้อนกลับได้ คุณแน่ใจจริงๆ หรือไม่?`;
                    }
                    showConfirmModal(
                        'ยืนยันการล้างข้อมูล',
                        message,
                        askForConfirmation
                    );
                }
            };
            
            clearDataConfirmationStep = 0;
            askForConfirmation();
        });

        document.getElementById('confirmCancelBtn').addEventListener('click', () => {
            closeModal('confirmModal');
            if(clearDataConfirmationStep > 0) {
                showToast("การล้างข้อมูลถูกยกเลิก");
                clearDataConfirmationStep = 0;
            }
            confirmCallback = null;
        });
        document.getElementById('confirmOkBtn').addEventListener('click', () => {
            if(confirmCallback) confirmCallback();
        });

        document.getElementById('exportDataBtn').addEventListener('click', exportData);
        document.getElementById('import-file').addEventListener('change', importData);
        document.getElementById('captureBtn').addEventListener('click', captureForLine);
        document.getElementById('openReportModalBtn').addEventListener('click', setupAndOpenReportModal);
        document.getElementById('openCommonAreaReportModalBtn').addEventListener('click', setupAndOpenCommonAreaReportModal);
        document.getElementById('closeReportModalBtn').addEventListener('click', () => closeModal('reportModal'));
        document.getElementById('notificationOkBtn').addEventListener('click', () => closeModal('notificationModal'));
        
        document.getElementById('task-category').addEventListener('change', (e) => {
            // Fix: Cast event target to HTMLSelectElement to get value.
            currentCategory = (e.target as HTMLSelectElement).value;
            currentDetailedView = 'summary';
            renderTable();
        });

        const viewResidentialBtn = document.getElementById('view-residential-btn');
        const viewCommonBtn = document.getElementById('view-common-btn');
        viewResidentialBtn.addEventListener('click', () => {
            if (currentView === 'residential') return;
            currentView = 'residential';
            viewResidentialBtn.classList.add('active');
            viewCommonBtn.classList.remove('active');
            renderTable();
        });
        viewCommonBtn.addEventListener('click', () => {
            if (currentView === 'common') return;
            currentView = 'common';
            viewCommonBtn.classList.add('active');
            viewResidentialBtn.classList.remove('active');
            renderTable();
        });

        document.getElementById('view-tiling-summary-btn').addEventListener('click', () => {
            if (currentDetailedView === 'summary') return;
            currentDetailedView = 'summary';
            renderTable();
        });
        document.getElementById('view-tiling-detailed-btn').addEventListener('click', () => {
            if (currentDetailedView === 'detailed') return;
            currentDetailedView = 'detailed';
            renderTable();
        });
        
        const mainTable = document.getElementById('main-table');
        // Fix: Type event as MouseEvent and cast target to HTMLElement.
        mainTable.addEventListener('mousedown', (e: MouseEvent) => {
            const cell = (e.target as HTMLElement).closest<HTMLElement>('.table-cell');
            if (!cell) return;
            e.preventDefault();
            isSelecting = true;
            if (!e.ctrlKey) clearSelection();
            cell.classList.toggle('selection-active');
            if (cell.classList.contains('selection-active')) selectedCells.add(cell); else selectedCells.delete(cell);
        });
        // Fix: Type event as MouseEvent and cast target to HTMLElement.
        mainTable.addEventListener('mouseover', (e: MouseEvent) => {
            if (!isSelecting) return;
            const cell = (e.target as HTMLElement).closest<HTMLElement>('.table-cell');
            if (cell && !selectedCells.has(cell)) {
                cell.classList.add('selection-active');
                selectedCells.add(cell);
            }
        });
        document.addEventListener('mouseup', () => {
            if (isSelecting) {
                isSelecting = false;
                if (selectedCells.size > 0) openUpdateModal(selectedCells.values().next().value);
            }
        });
    }

    // --- INITIALIZATION ---
    function init() {
        setupCategoryDropdown();
        bindEventListeners();
        if (initializeSupabase() && initializeGemini()) {
            setupRealtimeListenerAndInitApp();
        }
    }

    init();
});

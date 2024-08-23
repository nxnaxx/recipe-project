const $categoryList = document.getElementById('category');
const $cardCount = document.getElementById('card-count');
const $cardList = document.getElementById('card-list');
const $searchInput = document.getElementById('search-input');
const $searchList = document.getElementById('search-list');
const $searchBtn = document.getElementById('search-btn');
const $pagination = document.getElementById('pagination');
const $pageNumBtns = document.getElementById('page-num-btns');
const $prevBtn = document.getElementById('prev-btn');
const $nextBtn = document.getElementById('next-btn');

const categoryCache = {};
const PAGE_SIZE = 30;
let recipeData = [];
let isLoading = false;
let currentCategory = '전체';
let currentPage = 1;
let totalPages = 1;

const fetchData = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching data:', error);
  }
};

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('recipeDB', 1);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('recipes')) {
        db.createObjectStore('recipes', { keyPath: 'key' });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => {
      reject('Error opening IndexedDB:', e.target.errorCode);
    };
  });
};

const storeIndexDB = async (key, data) => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['recipes'], 'readwrite');
    const store = transaction.objectStore('recipes');
    const request = store.put({ key: key, value: data });

    request.onsuccess = () => resolve();
    request.onerror = (e) => {
      reject('Error storing data in IndexedDB:', e.target.errorCode);
    };
  });
};

const getDataFromIndexedDB = async (key) => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['recipes'], 'readonly');
    const store = transaction.objectStore('recipes');
    const request = store.get(key);

    request.onsuccess = (e) => {
      resolve(e.target.result ? e.target.result.value : null);
    };

    request.onerror = (e) => {
      reject('Error retrieving data from IndexedDB:', e.target.errorCode);
    };
  });
};

/** 초기 데이터 불러오기 */
const getInitialData = async () => {
  try {
    const savedData = await getDataFromIndexedDB('recipesData');
    document.body.style.overflow = 'hidden';

    if (sessionStorage.getItem('isTabOpen') && savedData.length > 0)
      recipeData = savedData;
    else {
      const data1 = await fetchData(`/api/data?start=1&end=1000`);
      const data2 = await fetchData(`/api/data?start=1001&end=2000`);
      const rows1 = data1?.COOKRCP01?.row || [];
      const rows2 = data2?.COOKRCP01?.row || [];

      recipeData = [...rows1, ...rows2];
      await storeIndexDB('recipesData', recipeData);
    }
  } catch (error) {
    console.error('Error getting initial data:', error);
  }
};

/** 카드 목록 표시 */
const loadCards = (cards) => {
  $cardList.innerHTML = '';
  const fragment = document.createDocumentFragment();

  cards.forEach((recipe) => {
    const newCard = document.createElement('li');
    newCard.className = 'recipe-card';
    newCard.innerHTML = `
      <button class="bookmark-btn ${
        localStorage.getItem('bookmark')?.includes(recipe.RCP_SEQ)
          ? 'active'
          : ''
      }">
        <i class="fa-solid fa-bookmark"></i>
      </button>
      <div class="recipe-img">
        <img src="${recipe.ATT_FILE_NO_MAIN || '/assets/no-image.jpg'}" alt="${
      recipe.RCP_NM
    }" />
      </div>
      <div class="card-content">
        <p>${recipe.RCP_NM}</p>
        <div class="recipe-details">
          <span>${recipe.INFO_ENG}kcal</span>
          <div class="category-tag">${recipe.RCP_PAT2.replace('&', '/')}</div>
        </div>
      </div>
      <a href="details.html?recipeName=${recipe.RCP_NM}" id="details-link"></a>
      `;
    fragment.appendChild(newCard);
  });
  $cardList.appendChild(fragment);
};

/** pagination 업데이트 */
const updatePagination = () => {
  const MAX_PAGE_COUNT = 7;
  $pagination.classList.remove('hidden');
  $pageNumBtns.innerHTML = '';

  let startPage = Math.max(1, currentPage - Math.floor(MAX_PAGE_COUNT / 2));
  let endPage = Math.min(totalPages, startPage + MAX_PAGE_COUNT - 1);

  const fragment = document.createDocumentFragment();
  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.setAttribute('data-num', i);
    pageBtn.className = i === currentPage ? 'num-btn active' : 'num-btn';
    pageBtn.innerHTML = i;
    fragment.appendChild(pageBtn);
  }
  $pageNumBtns.appendChild(fragment);
};

// card list 생성
const createCardList = () => {
  const $loader = document.getElementById('circle-loader');
  isLoading = true;
  $cardList.innerHTML = '';
  $loader.style.display = 'flex';

  let cache = categoryCache[currentCategory];

  if (!cache) {
    const filterData =
      currentCategory === '전체'
        ? recipeData
        : recipeData.filter((data) => data.RCP_PAT2 === currentCategory);
    const pageCount = Math.ceil(filterData.length / PAGE_SIZE);

    // 캐시 초기화
    categoryCache[currentCategory] = {
      pages: [],
      total: 0,
    };

    for (let i = 0; i < pageCount; i++) {
      const start = i * PAGE_SIZE;
      const end = start + PAGE_SIZE;
      categoryCache[currentCategory].pages[i] = filterData.slice(start, end);
    }

    categoryCache[currentCategory].total = filterData.length;
    cache = categoryCache[currentCategory];
  }

  totalPages = Math.ceil(categoryCache[currentCategory].total / PAGE_SIZE);
  loadCards(cache.pages[currentPage - 1]);
  updatePagination();
  $cardCount.textContent = cache.total.toLocaleString();
  $loader.style.display = 'none';
  isLoading = false;
};

// category 선택
const handleCategoryClick = async (e) => {
  if (isLoading) return;

  const li = e.target.closest('li');
  if (li?.classList.contains('active')) return;

  $categoryList.querySelector('.active')?.classList.remove('active');
  li.classList.add('active');
  currentCategory = li.dataset.name;
  currentPage = 1;

  createCardList();
};

/** 페이지 번호 선택 */
const handlePageClick = async (e) => {
  const button = e.target.closest('button');
  if (!button || button.classList.contains('active')) return;

  currentPage = Number(button.dataset.num);
  createCardList();
};

/** 이전, 다음 페이지 이동 */
const changePage = async (delta) => {
  const newPage = currentPage + delta;

  if (newPage > 0 && newPage <= totalPages) {
    currentPage = newPage;
    createCardList();
  }
};

/** 검색 필터링 및 결과 표시 */
const getSearchResults = () => {
  const searchValue = $searchInput.value.trim();

  if (searchValue) {
    const filteredData = recipeData.filter((data) =>
      data.RCP_PARTS_DTLS.includes(searchValue),
    );

    $cardCount.textContent = filteredData.length.toLocaleString();
    $searchInput.value = '';
    $searchList.classList.remove('visible');
    $categoryList.querySelector('.active')?.classList.remove('active');
    $pagination.classList.add('hidden');

    if (filteredData.length === 0) {
      $cardList.innerHTML = `<div id="no-cards" class="no-cards">
          <p><span>' ${searchValue} '</span> 로 검색한 결과가 없습니다.</p>
          <img src="./assets/no-search.png" alt="no results found" />
        </div>
        `;
      return;
    }

    loadCards(filteredData);

    const pTag = document.createElement('p');
    pTag.className = 'search-results';
    pTag.innerHTML = `<span>' ${searchValue} '</span> 로 검색한 결과입니다.`;
    $cardList.insertBefore(pTag, $cardList.firstChild);
  }
};

/** 검색어 목록 표시 */
const displaySearchList = (e) => {
  const searchValue = e.target.value.trim();
  const filteredData = recipeData.filter((data) =>
    data.RCP_NM.includes(searchValue),
  );

  // 검색어 목록 최대 15개까지 표출
  const maxCount = filteredData.length < 15 ? filteredData.length : 15;
  const fragment = document.createDocumentFragment();
  $searchList.innerHTML = '';

  for (let i = 0; i < maxCount; i++) {
    const searchItem = document.createElement('li');
    searchItem.textContent = `${filteredData[i].RCP_NM}`;
    searchItem.addEventListener('click', () => {
      window.location.href = `details.html?recipeName=${filteredData[i].RCP_NM}`;
    });
    fragment.appendChild(searchItem);
  }
  $searchList.appendChild(fragment);

  // 조건에 해당하는 검색 목록이 있다면 목록 표시
  filteredData.length >= 1000 || filteredData.length === 0
    ? $searchList.classList.remove('visible')
    : $searchList.classList.add('visible');
};

/** 검색 폼 외부 클릭 시 검색어 목록 숨기기 */
const hideSearchList = (e) => {
  const $searchForm = document.getElementById('search-form');
  if (!$searchForm.contains(e.target)) $searchList.classList.remove('visible');
};

/**
 * roulette game 구현
 * - START 버튼 클릭 시 룰렛 애니메이션
 * = 애니메이션 효과 종료 시 타겟 레시피 표시
 * - 초기화 버튼 클릭 시 새 랜덤 메뉴 생성
 * - 선택된 레시피 바로가기
 */
const $banner = document.getElementById('banner');
const $rouletteContainer = document.getElementById('roulette-con');
const $roulette = document.getElementById('roulette');
const $startBtn = document.getElementById('roulette-start');
const $rouletteResult = document.getElementById('roulette-result');
const $resetBtn = document.getElementById('roulette-reset');
const $closeBtn = document.getElementById('close-modal');

const itemSize = 10; // 룰렛 메뉴 개수
const rouletteData = [];
let isOpened = false;

// 룰렛 초기화
const initialRoulette = () => {
  const rouletteWidth = document.getElementById('roulette-box').offsetWidth;
  const degree = 360 / itemSize; // 룰렛 아이템 각도

  // 새 roulette 구성을 위한 기존 데이터 삭제
  $roulette.innerHTML = '';
  rouletteData.length = 0;
  $rouletteResult.classList.remove('visible');

  // 레시피 개수(1124) 범위 내 랜덤 인덱스 생성
  for (let i = 0; i < itemSize; i++) {
    const randomNum = Math.floor(Math.random() * 1124);
    const color = i % 2 === 0 ? 'var(--primary-light)' : 'var(--white)';
    rouletteData.push({ color, randomNum });
  }

  const fragment = document.createDocumentFragment();
  rouletteData.forEach((item, i) => {
    const rotateDeg = (360 / itemSize) * (i + 0.5); // 각 item이 균등한 영역을 차지하고 roulette target 중앙에 위치하도록 deg 조정
    const itemEl = document.createElement('div');
    itemEl.className = 'roulette-item';

    // 부채꼴 모양 생성 tan(90deg-rad) = 1 / tan(rad) = y / x, rad = deg * pi / 180
    itemEl.style.borderRightWidth = `${
      rouletteWidth * Math.tan((degree * Math.PI) / 180)
    }px`;
    itemEl.style.borderTopColor = item.color;
    itemEl.style.transform = `rotate(${rotateDeg}deg)`;

    // 룰렛 아이템에 랜덤 메뉴명 표시
    itemEl.innerHTML = `<p><span class="label">${
      recipeData[item.randomNum].RCP_NM
    }</span></p>`;
    fragment.appendChild(itemEl);
  });
  $roulette.appendChild(fragment);
  $roulette.style.transform = ``;
};

// 룰렛 modal toggle
const toggleModal = () => {
  $rouletteContainer.classList.toggle('open');
  // modal open 시 룰렛 초기화
  if (!isOpened) {
    initialRoulette();
    document.body.style.overflow = 'hidden';
  } else document.body.style.overflow = '';
  isOpened = !isOpened;
};

// 랜덤 정수 생성
const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// 룰렛 시작
const rotateRoulette = () => {
  const completeA = 360 * getRandomInt(5, 10) + getRandomInt(0, 360);
  const startTime = performance.now(); // 애니메이션 시작 시간
  const duration = 2000; // 애니메이션 지속 시간
  const startAngle = $roulette.target || 0; // 룰렛의 현재 각도
  const targetAngle = startAngle + completeA; // 목표 각도

  const animate = (time) => {
    const elapsed = time - startTime; // 경과 시간
    const progress = Math.min(elapsed / duration, 1); // 진행 정도 (0 ~ 1)
    const currentAngle = startAngle + (targetAngle - startAngle) * progress; // 현재 회전 각도 계산

    $roulette.style.transform = `rotate(${currentAngle}deg)`;

    if (progress < 1) requestAnimationFrame(animate); // 애니메이션 프레임 요청
    else completedAnimation(currentAngle);
  };

  const completedAnimation = (targetAngle) => {
    const targetIdx =
      itemSize - Math.ceil(((targetAngle % 360) + 360 / itemSize / 2) / 36);
    const targetRecipeIdx = rouletteData[targetIdx].randomNum;

    $rouletteResult.innerHTML = `
      <div class="result-img">
        <img src="${
          recipeData[targetRecipeIdx].ATT_FILE_NO_MAIN || '/assets/no-image.jpg'
        }" />
      </div>
      <div class="result-content">
        <p>${recipeData[targetRecipeIdx].RCP_NM}</p>
        <button id="go-to-recipe" class="go-to-recipe">레시피 바로가기</button>
      </div>
    `;
    $rouletteResult
      .querySelector('#go-to-recipe')
      .addEventListener('click', () => {
        window.location.href = `details.html?recipeName=${recipeData[targetRecipeIdx].RCP_NM}`;
      });
    $rouletteResult.classList.add('visible');
  };

  requestAnimationFrame(animate);
};

document.addEventListener('DOMContentLoaded', async () => {
  await getInitialData();
  sessionStorage.setItem('isTabOpen', 'true');
  createCardList();
  document.getElementById('loading-con').style.display = 'none';
  document.body.style.overflow = '';
});

$categoryList.addEventListener('click', handleCategoryClick);
$pageNumBtns.addEventListener('click', handlePageClick);
$prevBtn.addEventListener('click', () => changePage(-1));
$nextBtn.addEventListener('click', () => changePage(1));
$searchInput.addEventListener('input', displaySearchList);
$searchInput.addEventListener('keyup', (e) => {
  if (e.key === 'Enter') getSearchResults();
});
$searchBtn.addEventListener('click', getSearchResults);
document.addEventListener('click', hideSearchList);
$banner.addEventListener('click', toggleModal);
$closeBtn.addEventListener('click', toggleModal);
$startBtn.addEventListener('click', rotateRoulette);
$resetBtn.addEventListener('click', initialRoulette);

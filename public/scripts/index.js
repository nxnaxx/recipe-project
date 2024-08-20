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
const $roulette = document.getElementById('roulette');
const $startBtn = document.getElementById('roulette-start');
const $banner = document.getElementById('banner');
const $rouletteContainer = document.getElementById('roulette-con');
const $closeBtn = document.getElementById('close-modal');
const $resetBtn = document.getElementById('roulette-reset');

const categoryCache = {};
const PAGE_SIZE = 30;

let searchData = [];
let isLoading = false;
let currentCategory = '전체';
let currentPage = 1;
let totalPages = 1;
const rouletteData = [];
let currentRotation = 0;

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

const getQueryParams = (category) => {
  return category === '전체' ? {} : { RCP_PAT2: `'${category}'` };
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
const createCardList = async (queryParams = {}) => {
  const $loader = document.getElementById('loader');

  isLoading = true;
  $cardList.innerHTML = '';
  $loader.style.display = 'flex';

  // api 요청 횟수 감소를 위해 카테고리 캐시 사용
  const cache = categoryCache[currentCategory];
  if (!cache) categoryCache[currentCategory] = { pages: [], total: 0 };

  if (!categoryCache[currentCategory].pages[currentPage - 1]) {
    const start = (currentPage - 1) * PAGE_SIZE + 1;
    const end = start + PAGE_SIZE - 1;

    const queryString = new URLSearchParams(queryParams).toString();
    const url = `/api/data?start=${encodeURIComponent(
      start,
    )}&end=${encodeURIComponent(end)}&${queryString}`;

    const data = await fetchData(url);

    if (data?.COOKRCP01?.row) {
      categoryCache[currentCategory].pages[currentPage - 1] =
        data.COOKRCP01.row;
      categoryCache[currentCategory].total = Number(data.COOKRCP01.total_count);
    } else {
      categoryCache[currentCategory].pages[currentPage - 1] = [];
      categoryCache[currentCategory].total = 0;
    }
  }

  const cacheData = categoryCache[currentCategory];
  totalPages = Math.ceil(cacheData.total / PAGE_SIZE);

  loadCards(cacheData.pages[currentPage - 1]);
  updatePagination();
  $cardCount.textContent = cacheData.total.toLocaleString();
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

  await createCardList(getQueryParams(currentCategory));
};

/** 페이지 번호 선택 */
const handlePageClick = async (e) => {
  const button = e.target.closest('button');
  if (!button || button.classList.contains('active')) return;

  currentPage = Number(button.dataset.num);
  await createCardList(getQueryParams(currentCategory));
};

/** 이전, 다음 페이지 이동 */
const changePage = async (delta) => {
  const newPage = currentPage + delta;
  if (newPage > 0 && newPage <= totalPages) {
    currentPage = newPage;
    await createCardList(getQueryParams(currentCategory));
  }
};

/** 검색을 위한 초기 데이터 불러오기 */
const getInitialData = async () => {
  try {
    const url1 = `/api/data?start=1&end=1000`;
    const url2 = `/api/data?start=1001&end=2000`;

    const data1 = await fetchData(url1);
    const data2 = await fetchData(url2);

    const rows1 = data1?.COOKRCP01?.row || [];
    const rows2 = data2?.COOKRCP01?.row || [];

    return [...rows1, ...rows2];
  } catch (error) {
    console.error('Error getting initial data:', error);
    return []; // 데이터 로딩 실패 시 빈 배열 반환
  }
};

/** 검색 필터링 및 결과 표시 */
const getSearchResults = () => {
  const searchValue = $searchInput.value.trim();

  if (searchValue) {
    const filteredData = searchData.filter((data) =>
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
  const filteredData = searchData.filter((data) =>
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

// /** 데이터가 로드된 후, 이벤트 리스너 추가 */
const initializeSearch = async () => {
  searchData = await getInitialData();

  $searchInput.addEventListener('input', displaySearchList);
  $searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') getSearchResults();
  });
  $searchBtn.addEventListener('click', getSearchResults);
  document.addEventListener('click', hideSearchList);
};

// 룰렛 초기화
const initialRoulette = () => {
  const rouletteWidth = 400;
  const angleOffset = -45;
  const itemSize = 10; // 10개의 아이템
  const d = 360 / itemSize;

  for (let i = 0; i < itemSize; i++) {
    const randomNum = Math.floor(Math.random() * 1124);
    const color = i % 2 === 0 ? 'var(--primary-light)' : 'var(--white)';
    rouletteData.push({ color, randomNum });
  }

  rouletteData.forEach((item, i) => {
    const rt = (i + 1) * d + angleOffset;
    const itemEl = document.createElement('div');
    itemEl.className = 'roulette-item';
    itemEl.style.position = 'absolute';
    itemEl.style.top = `-212px`;
    itemEl.style.left = `188px`;
    itemEl.style.borderTopWidth = `${rouletteWidth}px`;
    itemEl.style.borderRightWidth = `${
      rouletteWidth / (1 / Math.tan((d * Math.PI) / 180))
    }px`;
    itemEl.style.borderTopColor = item.color;
    itemEl.style.transform = `rotate(${rt}deg)`;

    const pElement = document.createElement('p');
    pElement.innerHTML = `<span class="label">${item.randomNum}</span>`;

    itemEl.appendChild(pElement);
    $roulette.appendChild(itemEl);
  });
};

const toggleModal = () => {
  $rouletteContainer.classList.toggle('open');
};

const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// 룰렛 시작
const rotateRoulette = () => {
  const completeA = 360 * getRandomInt(5, 10) + getRandomInt(0, 360);
  const startTime = performance.now(); // 애니메이션 시작 시간
  const duration = 2500; // 애니메이션 지속 시간
  const startAngle = currentRotation || 0; // 현재의 회전 각도 (초기값 0도)
  const targetAngle = startAngle + completeA; // 회전 후의 목표 각도

  function animate(time) {
    const elapsed = time - startTime; // 경과 시간
    const progress = Math.min(elapsed / duration, 1); // 진행 정도 (0~1)

    const currentAngle = startAngle + (targetAngle - startAngle) * progress; // 현재 회전 각도 계산
    $roulette.style.transform = `rotate(${currentAngle}deg)`; // CSS로 회전 적용

    if (progress < 1) {
      requestAnimationFrame(animate); // 애니메이션 프레임 요청
    } else {
      currentRotation = currentAngle % 360; // 회전이 끝난 후의 각도를 저장 (360도 내로 제한)
    }
  }

  requestAnimationFrame(animate); // 애니메이션 시작
};

initializeSearch();
createCardList();
initialRoulette();

$categoryList.addEventListener('click', handleCategoryClick);
$pageNumBtns.addEventListener('click', handlePageClick);
$prevBtn.addEventListener('click', () => changePage(-1));
$nextBtn.addEventListener('click', () => changePage(1));
$banner.addEventListener('click', toggleModal);
$closeBtn.addEventListener('click', toggleModal);
$startBtn.addEventListener('click', rotateRoulette);
$resetBtn.addEventListener('click', initialRoulette);

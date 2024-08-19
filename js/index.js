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

let searchData = [];
let isLoading = false;
let currentCategory = '전체';
let currentPage = 1;
let totalPages = 1;

// API 데이터 가져오기
const fetchData = async (url) => {
  try {
    const response = await fetch(url);
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
    // mock server
    const baseUrl = `https://b24ec182-58f9-4bde-932e-7428a89fac14.mock.pstmn.io/api/${API_KEY}/COOKRCP01/json/${start}/${end}`;
    // const baseUrl = `http://openapi.foodsafetykorea.go.kr/api/${API_KEY}/COOKRCP01/json/${start}/${end}`;
    const queryString = new URLSearchParams(queryParams).toString();
    const data = await fetchData(`${baseUrl}/${queryString}`);

    categoryCache[currentCategory].pages[currentPage - 1] = data.COOKRCP01.row;
    categoryCache[currentCategory].total = Number(data.COOKRCP01.total_count);
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
  // mock-server
  const url1 = `https://b24ec182-58f9-4bde-932e-7428a89fac14.mock.pstmn.io/api/${API_KEY}/COOKRCP01/json/1/1000/`;
  const url2 = `https://b24ec182-58f9-4bde-932e-7428a89fac14.mock.pstmn.io/api/${API_KEY}/COOKRCP01/json/1001/2000/`;
  const [data1, data2] = await Promise.all([fetchData(url1), fetchData(url2)]);
  searchData = [...data1.COOKRCP01.row, ...data2.COOKRCP01.row];
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

/** 검색 폼 외부 클릭 시 검색어 목록 숨기긱 */
const hideSearchList = (e) => {
  const $searchForm = document.getElementById('search-form');
  if (!$searchForm.contains(e.target)) $searchList.classList.remove('visible');
};

createCardList();
getInitialData();
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

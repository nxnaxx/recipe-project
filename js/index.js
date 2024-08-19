const $categoryList = document.getElementById('category');
const $cardCount = document.getElementById('card-count');
const $cardList = document.getElementById('card-list');
const $pageNumBtns = document.getElementById('page-num-btns');
const $prevBtn = document.getElementById('prev-btn');
const $nextBtn = document.getElementById('next-btn');

const categoryCache = {};
let isLoading = false;

const PAGE_SIZE = 30;
let currentPage = 1;
let totalPages = 1;
let currentCategory = '전체';

const fetchData = async (url) => {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
  }
};

const loadCards = (cards) => {
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

// pagination 업데이트
const updatePagination = () => {
  const MAX_PAGE_COUNT = 7;
  $pageNumBtns.innerHTML = '';

  let startPage = Math.max(1, currentPage - Math.floor(MAX_PAGE_COUNT / 2));
  let endPage = Math.min(totalPages, startPage + MAX_PAGE_COUNT - 1);

  if (totalPages < MAX_PAGE_COUNT) {
    startPage = 1;
    endPage = totalPages;
  }

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

// recipe card list 생성
const createCardList = async (queryParams = {}) => {
  const $loader = document.getElementById('loader');
  isLoading = true;

  $cardList.innerHTML = '';
  $loader.style.display = 'flex';

  const cache = categoryCache[currentCategory];
  if (!cache) categoryCache[currentCategory] = { pages: [], total: 0 };

  if (!categoryCache[currentCategory].pages[currentPage - 1]) {
    const start = (currentPage - 1) * PAGE_SIZE + 1;
    const end = start + PAGE_SIZE - 1;
    // mock server
    const baseUrl = `https://b24ec182-58f9-4bde-932e-7428a89fac14.mock.pstmn.io/api/${API_KEY}/COOKRCP01/json/${start}/${end}`;
    const queryString = new URLSearchParams(queryParams).toString();

    const data = await fetchData(
      `${baseUrl}/${queryString}`,
      queryParams.RCP_PAT2,
    );

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

  await createCardList(
    currentCategory === '전체' ? {} : { RCP_PAT2: `'${currentCategory}'` },
  );
};

const handlePageClick = async (e) => {
  const button = e.target.closest('button');
  if (!button || button?.classList.contains('active')) return;

  currentPage = Number(button.dataset.num);
  await createCardList(
    currentCategory === '전체' ? {} : { RCP_PAT2: `'${currentCategory}'` },
  );
};

const changePage = async (delta) => {
  const newPage = currentPage + delta;
  if (newPage > 0 && newPage <= totalPages) {
    currentPage = newPage;
    await createCardList(
      currentCategory === '전체' ? {} : { RCP_PAT2: `'${currentCategory}'` },
    );
  }
};

$categoryList.addEventListener('click', handleCategoryClick);
$pageNumBtns.addEventListener('click', handlePageClick);
$prevBtn.addEventListener('click', () => changePage(-1));
$nextBtn.addEventListener('click', () => changePage(1));
createCardList();

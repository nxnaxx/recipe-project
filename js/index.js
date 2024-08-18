const $categoryList = document.getElementById('category');
const $cardCount = document.getElementById('card-count');
const $cardList = document.getElementById('card-list');

let isLoading = false;

const fetchData = async (url) => {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
  }
};

// recipe card list 생성
const createCardList = async (queryParams = {}) => {
  isLoading = true;
  $cardList.innerHTML = '';
  document.querySelector('.loading').style.display = 'flex';

  // mock server
  const baseUrl = `https://fdbac7e9-cc88-4e30-9a85-03b4bd0e4f09.mock.pstmn.io/api/${API_KEY}/COOKRCP01/json/1/1000`;
  const queryString = new URLSearchParams(queryParams).toString();
  const data = await fetchData(`${baseUrl}/${queryString}`);
  const recipes = data.COOKRCP01.row;
  const cardCount = data.COOKRCP01.total_count;
  const fragment = document.createDocumentFragment();

  $cardCount.textContent = Number(cardCount).toLocaleString();
  recipes.forEach((recipe) => {
    const newCard = document.createElement('li');

    newCard.className = 'recipe-card';
    /* 추후 bookmark active 추가 */
    newCard.innerHTML = `<button class="bookmark-btn">
                          <i class="fa-solid fa-bookmark"></i>
                        </button>
                        <div class="recipe-img">
                          <img src="${
                            recipe.ATT_FILE_NO_MAIN || '/assets/no-image.jpg'
                          }" alt="${recipe.RCP_NM}" />
                        </div>
                        <div class="card-content">
                          <p>${recipe.RCP_NM}</p>
                          <div class="recipe-details">
                            <span>${recipe.INFO_ENG}kcal</span>
                            <div class="category-tag">${recipe.RCP_PAT2.replace(
                              '&',
                              '/',
                            )}</div>
                          </div>
                        </div>
                        <a href="details.html?seq=${
                          recipe.RCP_SEQ
                        }" id="details-link"></a>
                        `;
    fragment.appendChild(newCard);
  });
  $cardList.appendChild(fragment);
  document.querySelector('.loading').style.display = 'none';
  isLoading = false;
};

// category 선택
const handleCategoryClick = async (e) => {
  // card list 로드 중일 때, 다른 카테고리 선택 불가 => 다른 카테고리 이동 시 이전 card list 표시 방지 위함
  if (isLoading) return;

  const li = e.target.closest('li');

  // 이미 선택된 카테고리인 경우, 재로드 방지
  if (li?.classList.contains('active')) return;

  if (li) {
    $categoryList
      .querySelectorAll('li')
      .forEach((liItem) => liItem.classList.remove('active'));
    li.classList.add('active');

    li.dataset.name === '전체'
      ? await createCardList()
      : await createCardList({ RCP_PAT2: `'${li.dataset.name}'` });
  }
};

$categoryList.addEventListener('click', handleCategoryClick);

createCardList();

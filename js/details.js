const $backToListBtn = document.getElementById('back-btn');
const $bookmarkBtn = document.getElementById('bookmark-btn');
// 새로고침 시 sessionStorage에 저장된 정보 불러오기 (api 재호출 방지)
const storedData = sessionStorage.getItem('pageData');
let recipeData = storedData ? JSON.parse(storedData) : null;

const fetchData = async (url) => {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('Error fetching data:', error);
  }
};

/**
 * 로딩 화면 제어
 * @param {boolean} isLoading
 */
const toggleLoading = (isLoading) => {
  const $loader = document.getElementById('loader');
  $loader.style.display = isLoading ? 'flex' : 'none';
  document.body.style.overflow = isLoading ? 'hidden' : '';
};

/**
 * 파일 확장자 체크
 * @param {string} path
 */
const isImageFormat = (path) => {
  const pngPattern = /\.(png)$/i;
  const jpgPattern = /\.(jpg|jpeg)$/i;
  return pngPattern.test(path) || jpgPattern.test(path) ? path : null;
};

/** 재료 리스트 생성 */
const createIngredients = () => {
  const $ingredientsList = document.getElementById('ingredients-list');
  const fragment = document.createDocumentFragment();

  // ,와 \n, :, -를 기준으로 문자열 분리 (단, 괄호() 안의 ,는 포함)
  const ingredientsArr = recipeData.RCP_PARTS_DTLS.replace(
    /-\s*[^:]*\s*:|\[[^\]]*\]|재료|●\s*[^:]*\s*:|·\s*[^:]*\s*:|\n|저나트륨[^:]*/g,
    ',',
  )
    .replace(/(\([^)]*)\s*,\s*/g, '$1__COMMA__')
    .split(/,|, |:/)
    .map((part) => part.replace(/__COMMA__/g, ','));
  let liCount = 0;

  ingredientsArr.forEach((item) => {
    const newItem = document.createElement('li');
    if (!item.trim() || item.trim() === recipeData.RCP_NM.replace(/\s+/g, ''))
      return;

    /* 추후 checkbox checked 변경 */
    newItem.innerHTML = `<input type="checkbox" class="checkbox" checked />
                        <span class="checkmark"></span>
                        <span>${item}</span>`;
    liCount++;
    fragment.appendChild(newItem);
  });
  $ingredientsList.style.gridTemplateRows = `repeat(${Math.ceil(
    liCount / 2,
  )}, auto)`;
  $ingredientsList.appendChild(fragment);
};

/** 영양성분 표시 */
const createNutrition = () => {
  const $nutritionList = document.getElementById('nutrition-list');

  $nutritionList.innerHTML = `
                              <li><span>칼로리</span><span>${
                                recipeData.INFO_ENG
                              }kcal</span></li>
                              <li><span>탄수화물</span><span>${
                                recipeData.INFO_CAR
                              }g</span></li>
                              <li><span>지방</span><span>${
                                recipeData.INFO_FAT
                              }g</span></li>
                              <li><span>단백질</span><span>${
                                recipeData.INFO_PRO
                              }g</span></li>
                              <li><span>나트륨</span><span>${Number(
                                recipeData.INFO_NA,
                              ).toLocaleString()}mg</span></li>`;
};

/** 조리 순서 생성 */
const createSteps = () => {
  const $cookingSteps = document.getElementById('cooking-steps');
  const fragment = document.createDocumentFragment();

  const stepList = Object.fromEntries(
    Object.entries(recipeData).filter(
      ([key, value]) => key.includes('MANUAL') && !key.includes('IMG') && value,
    ),
  );

  Object.entries(stepList).forEach(([key, value], i) => {
    const stepNum = key.slice(-2);
    const stepItem = document.createElement('li');

    stepItem.innerHTML = `<div class="step-img">
                            <img src="${
                              recipeData[`MANUAL_IMG${stepNum}`] ||
                              './assets/no-image.jpg'
                            }" alt="step ${i + 1}" />
                          </div>
                          <div class="step-num">${i + 1}</div>
                          <p>${value.replace(/\b\d+\.|[.][a-z]/g, '')}</p>`;
    fragment.appendChild(stepItem);
  });
  $cookingSteps.appendChild(fragment);
};

// 페이지 로드 및 렌더링
const renderPage = async () => {
  const $category = document.getElementById('category');
  const $title = document.getElementById('title');
  const $mainImg = document.querySelector('#main-image > img');
  const $reducedTip = document.getElementById('tip-content');
  const $tags = document.getElementById('tags');

  // mock server
  const baseUrl = `https://b24ec182-58f9-4bde-932e-7428a89fac14.mock.pstmn.io/api/${API_KEY}/COOKRCP01/json/1/1000`;
  const urlParams = new URLSearchParams(window.location.search);
  const recipeName = urlParams.get('recipeName');

  toggleLoading(true);

  if (!recipeData || recipeData.RCP_NM !== recipeName) {
    const data = await fetchData(`${baseUrl}/RCP_NM=${recipeName}`);
    // recipeName과 완전히 동일한 데이터만 저장
    recipeData =
      data.COOKRCP01.total_count === '1'
        ? data.COOKRCP01.row[0]
        : data.COOKRCP01.row.find((x) => x.RCP_NM === recipeName);
    sessionStorage.setItem('pageData', JSON.stringify(recipeData));
  }

  toggleLoading(false);

  $category.textContent = recipeData.RCP_PAT2.replace('&', '/');
  $title.textContent = recipeData.RCP_NM;

  // bookmark active 표시
  const bookmark = localStorage.getItem('bookmark');
  if (bookmark?.includes(recipeData.RCP_SEQ)) {
    $bookmarkBtn.classList.add('active');
  }

  // ATT_FILE_NO_MAIN이 없는 경우 ATT_FILE_NO_MK로 대체. 둘 다 없는 경우 no-image
  $mainImg.src =
    isImageFormat(recipeData.ATT_FILE_NO_MAIN) ||
    isImageFormat(recipeData.ATT_FILE_NO_MK) ||
    './assets/no-image.jpg';

  $reducedTip.textContent =
    recipeData.RCP_NA_TIP || '해당 조리법의 TIP이 없어요.';
  if (!recipeData.RCP_NA_TIP) $reducedTip.style.color = 'var(--dark-2)';

  const tag = document.createElement('span');
  tag.textContent = recipeData.HASH_TAG ? `# ${recipeData.HASH_TAG}` : '-';
  $tags.appendChild(tag);

  createIngredients();
  createNutrition();
  createSteps();
};

$backToListBtn.addEventListener('click', () => {
  window.location.href = 'index.html';
});

// bookmark toggle
const toggleBookmark = () => {
  const storedValues = localStorage.getItem('bookmark');
  const newValue = recipeData.RCP_SEQ;

  bookmarks = storedValues ? JSON.parse(storedValues) : [];

  if (bookmarks.includes(newValue)) {
    bookmarks = bookmarks.filter((item) => item !== newValue);
  } else bookmarks.push(newValue);

  $bookmarkBtn.classList.toggle('active');
  localStorage.setItem('bookmark', JSON.stringify(bookmarks));
};

renderPage();
$bookmarkBtn.addEventListener('click', toggleBookmark);

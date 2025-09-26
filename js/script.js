document.addEventListener("DOMContentLoaded", () => {
    // 后端 API 的基础 URL
    const API_BASE_URL = "http://localhost:6460";
    const REVIEWS_API_URL = `${API_BASE_URL}/api/reviews`;
    const DISCUSSIONS_API_URL = `${API_BASE_URL}/api/discussions`;

    // 全局状态标志，防止重复提交
    let isSubmittingReview = false;
    let isSubmittingDiscussion = false;

    /* ---------- 全局函数 ---------- */

    // 简单的 HTML 转义，防止 XSS（用于用户输入）
    function escapeHtml(str) {
        if (!str && str !== 0) return '';
        return String(str)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }
    
    // 全局函数：显示 Toast 提示
    function showToast(message) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => { toast.classList.add('show'); }, 10);
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => {
                container.removeChild(toast);
            }, { once: true });
        }, 3000);
    }
    
    // 显示/隐藏加载指示器
    function showLoadingIndicator() {
        console.log('显示加载指示器...');
    }
    function hideLoadingIndicator() {
        console.log('隐藏加载指示器...');
    }
    
    /* ---------- 轮播 ---------- */
    let slideIndex = 0;
    function showSlides() {
        const slides = document.querySelectorAll(".slides img");
        const dots = document.querySelectorAll(".dot");
        if (!slides || slides.length === 0) return;
        slides.forEach(s => s.style.display = "none");
        slideIndex = (slideIndex % slides.length) + 1;
        const current = slides[slideIndex - 1];
        if (current) current.style.display = "block";
        if (dots && dots.length > 0) {
            dots.forEach(d => d.classList.remove("active"));
            if (dots[slideIndex - 1]) dots[slideIndex - 1].classList.add("active");
        }
        setTimeout(showSlides, 5000);
    }
    if (document.querySelectorAll(".slides img").length > 0) {
        showSlides();
    }
    window.currentSlide = function (n) {
        slideIndex = n - 1;
        showSlides();
    };

    /* ---------- 订阅表单 (后端集成) ---------- */
    const subscribeForm = document.getElementById("subscribe-form");
    const subscribeBox = document.getElementById("subscribe-box");
    if (subscribeForm && subscribeBox) {
        subscribeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const subscriptionData = { username: name, email: email, password: password };
            
            fetch(`${API_BASE_URL}/api/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subscriptionData)
            })
            .then(response => {
                // 即使是4xx或5xx状态码，也要继续处理响应
                return response.json().then(data => ({
                    status: response.status,
                    ok: response.ok,
                    data: data
                }));
            })
            .then(({status, ok, data}) => {
                if (ok) {
                    subscribeForm.style.display = 'none';
                    subscribeBox.innerHTML = '<h2>感谢订阅！</h2><p>我们已经成功收到了您的订阅信息。</p>';
                } else {
                    let errorMessage = '订阅失败，请重试。';
                    if (data.message) {
                        errorMessage = `订阅失败: ${data.message}`;
                    } else if (data.error) {
                        errorMessage = `订阅失败: ${data.error}`;
                    }
                    alert(errorMessage);
                }
            })
            .catch(error => {
                console.error('网络连接错误:', error);
                alert('网络连接错误，请检查您的后端服务是否已启动。');
            });
        });
    }

    /* ---------- 搜索框（后端集成） ---------- */
    const searchBoxes = document.querySelectorAll(".search-box");
    searchBoxes.forEach(box => {
        const input = box.querySelector("input");
        const button = box.querySelector("button");
        if (input && button) {
            button.addEventListener("click", () => performSearch(input.value));
            input.addEventListener("keypress", (e) => {
                if (e.key === "Enter") performSearch(input.value);
            });
        }
    });

    function performSearch(keyword) {
        if (!keyword.trim()) return alert("请输入搜索关键词");
        
        fetch(`${API_BASE_URL}/api/novels/search?keyword=${encodeURIComponent(keyword)}`)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then(data => displaySearchResults(data, keyword))
            .catch(err => {
                console.error("搜索出错:", err);
                alert("搜索出错，请稍后重试: " + err.message);
            });
    }
    
    function displaySearchResults(novels, keyword) {
        let overlay = document.getElementById('search-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'search-overlay';
            overlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; justify-content: center; align-items: center;`;
            document.body.appendChild(overlay);
        }
        let resultContainer = document.getElementById('search-results-container');
        if (!resultContainer) {
            resultContainer = document.createElement('div');
            resultContainer.id = 'search-results-container';
            resultContainer.style.cssText = `background: white; width: 90%; max-width: 1200px; max-height: 90vh; overflow-y: auto; border-radius: 8px; padding: 20px; position: relative;`;
            overlay.appendChild(resultContainer);
        }
        let closeBtn = document.getElementById('search-close-btn');
        if (!closeBtn) {
            closeBtn = document.createElement('button');
            closeBtn.id = 'search-close-btn';
            closeBtn.innerHTML = '&times;';
            closeBtn.style.cssText = `position: absolute; top: 10px; right: 15px; background: none; border: none; font-size: 30px; cursor: pointer; z-index: 10001;`;
            closeBtn.addEventListener('click', () => document.body.removeChild(overlay));
            resultContainer.appendChild(closeBtn);
        }
        if (novels.length === 0) {
            resultContainer.innerHTML = `<h2>搜索结果</h2><p>没有找到与"${keyword}"相关的书籍</p><button id="close-search" style="margin-top: 20px; padding: 10px 20px; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer;">关闭</button>`;
        } else {
            let html = `<h2>搜索结果：${keyword}</h2><p>找到 ${novels.length} 本相关书籍</p><div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; margin-top: 20px;">`;
            novels.forEach(novel => {
                const detailLink = `detail.html?id=${novel.id}`;
                html += `<div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; text-align: center; background: #f9f9f9;">${novel.coverUrl ? `<a href="${detailLink}"><img src="${novel.coverUrl}" alt="${novel.title}" style="width: 100%; max-width: 150px; height: auto; border-radius: 4px;"></a>` : `<a href="${detailLink}"><div style="width: 150px; height: 200px; background: #eee; margin: 0 auto; display: flex; align-items: center; justify-content: center;">暂无封面</div></a>`}<h3><a href="${detailLink}" style="text-decoration: none; color: #333;">${novel.title || '未知标题'}</a></h3><p style="font-size: 12px; color: #666; margin: 5px 0;">角色: ${novel.characters || '未提供'}</p><p style="font-size: 12px; color: #333; margin: 5px 0;">${novel.description || '暂无简介'}</p></div>`;
            });
            html += `</div><button id="close-search" style="margin-top: 20px; padding: 10px 20px; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer;">关闭</button>`;
            resultContainer.innerHTML = html;
        }
        const closeSearchBtn = document.getElementById('close-search');
        if (closeSearchBtn) closeSearchBtn.addEventListener('click', () => document.body.removeChild(overlay));
        overlay.addEventListener('click', (e) => { if (e.target === overlay) document.body.removeChild(overlay); });
        overlay.style.display = 'flex';
    }

    /* ---------- 阅读功能（后端集成） ---------- */
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('read-btn')) {
            const novelId = e.target.getAttribute('data-novel-id');
            loadChapterContent(novelId, 1);
        }
    });

    function loadChapterList(novelId) {
        return fetch(`${API_BASE_URL}/api/novels/${novelId}/chapters`)
            .then(response => {
                if (!response.ok) throw new Error('获取章节列表失败');
                return response.json();
            });
    }

    function displayNovelContent(content, novelId, chapterNumber = 1) {
        const overlay = document.createElement('div');
        overlay.className = 'reading-overlay';
        overlay.innerHTML = `<div class="reading-container"><div class="reading-header"><button class="close-btn">&times;</button><h2>小说阅读</h2><button class="toc-btn">目录</button></div><div class="reading-content"><pre>${content}</pre></div><div class="reading-footer"><button class="read-prev-btn">上一章</button><button class="read-next-btn">下一章</button><button class="bookmark-btn">添加书签</button></div></div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('.close-btn').addEventListener('click', () => document.body.removeChild(overlay));
        overlay.addEventListener('click', (e) => { if (e.target === overlay) document.body.removeChild(overlay); });
        overlay.querySelector('.toc-btn').addEventListener('click', () => {
            loadChapterList(novelId)
                .then(chapters => displayChapterList(chapters, novelId))
                .catch(error => alert('获取章节列表失败: ' + error.message));
        });
        overlay.querySelector('.read-prev-btn').addEventListener('click', () => {
            if (chapterNumber > 1) loadChapterContent(novelId, chapterNumber - 1);
            else alert('已经是第一章了');
        });
        overlay.querySelector('.read-next-btn').addEventListener('click', () => loadChapterContent(novelId, chapterNumber + 1));
        overlay.querySelector('.bookmark-btn').addEventListener('click', () => alert('书签功能将在后续版本中实现'));
    }

    function loadChapterContent(novelId, chapterNumber) {
        showLoadingIndicator();
        fetch(`${API_BASE_URL}/api/novels/${novelId}/chapters/${chapterNumber}`)
            .then(response => {
                if (!response.ok) throw new Error('获取章节内容失败');
                return response.json();
            })
            .then(chapter => {
                hideLoadingIndicator();
                const currentOverlay = document.querySelector('.reading-overlay');
                if (currentOverlay) document.body.removeChild(currentOverlay);
                displayNovelContent(chapter.content, novelId, chapter.chapterNumber);
            })
            .catch(error => {
                hideLoadingIndicator();
                console.error('获取章节内容失败:', error);
                alert('获取章节内容失败: ' + error.message);
            });
    }

    function displayChapterList(chapters, novelId) {
        const tocOverlay = document.createElement('div');
        tocOverlay.className = 'toc-overlay';
        tocOverlay.innerHTML = `<div class="toc-container"><div class="toc-header"><button class="close-toc-btn">&times;</button><h2>目录</h2></div><div class="toc-content"><ul>${chapters.map(chapter => `<li><button class="chapter-link" data-chapter="${chapter.chapterNumber}">${chapter.title || `第${chapter.chapterNumber}章`}</button></li>`).join('')}</ul></div></div>`;
        document.body.appendChild(tocOverlay);
        tocOverlay.querySelector('.close-toc-btn').addEventListener('click', () => document.body.removeChild(tocOverlay));
        tocOverlay.querySelectorAll('.chapter-link').forEach(button => {
            button.addEventListener('click', (e) => {
                const chapterNumber = parseInt(e.target.getAttribute('data-chapter'));
                document.body.removeChild(tocOverlay);
                loadChapterContent(novelId, chapterNumber);
            });
        });
    }

    /*-------------视频播放器----------------*/
    const videoData = [
        {
            id: 'video-1',
            type: 'tv-series',
            title: '走向零',
            poster: 'images/WATCH-TowardsZeroKA.avif',
            description: '奥斯卡金像奖获奖银幕偶像安杰丽卡·休斯顿 （Anjelica Huston） 领衔主演这部由三部分改编的《走向零》的明星演员阵容。',
            metadata: { genre: '悬疑, 犯罪', country: '英国', year: '2023', runtime: '120分钟' },
            cast: [{ name: '安杰丽卡·休斯顿', image: 'images/cast-1.webp' }, { name: '安吉拉·兰斯伯瑞', image: 'images/cast-2.avif' }, { name: '大卫·苏切特', image: 'images/cast-3.avif' }, { name: '约翰·芬奇', image: 'images/cast-4.avif' }],
            episodes: [{ id: 'ep-1', title: '第一集', src: '/movies/The Looney Tunes Show_S01E02_Members Only.mp4' }, { id: 'ep-2', title: '第二集', src: '/movies/S01Ep01 The Body in the Library (Part One).mp4' }]
        },
        {
            id: 'video-2',
            type: 'movie',
            title: '七表盘之谜',
            src: '/movies/S01Ep01 The Body in the Library (Part One).mp4',
            poster: 'images/WATCH-the seven dials mystery.avif',
            description: '布罗德彻奇编剧克里斯·奇布纳尔 （Chris Chibnall） 为 Netflix 拍摄的阿加莎·克里斯蒂 （Agatha Christie） 新剧集正在拍摄中。',
            metadata: { genre: '悬疑', country: '英国', year: '2023', runtime: '90分钟' },
            cast: [{ name: '克莱尔·富伊', image: 'images/cast-5.avif' }, { name: '奥利维亚·科尔曼', image: 'images/cast-6.avif' }, { name: '马修·古迪', image: 'images/cast-7.avif' }, { name: '安吉拉·兰斯伯瑞', image: 'images/cast-8.avif' }],
            episodes: [{ id: 'ep-1', title: '七表盘之谜', src: '/movies/S01Ep01 The Body in the Library (Part One).mp4' }]
        }
    ];
    let currentVideo = videoData[0];
    const video = document.getElementById('main-video');
    const sidebarTabs = document.querySelectorAll('.sidebar-tabs .tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const detailsPoster = document.getElementById('details-poster');
    const detailsTitle = document.getElementById('details-title');
    const detailsMetadata = document.getElementById('details-metadata');
    const detailsSummary = document.getElementById('details-summary');
    const castGrid = document.querySelector('.cast-grid');
    const episodeList = document.querySelector('.episode-list');

    function loadVideo(videoInfo) {
        currentVideo = videoInfo;
        let defaultSrc = videoInfo.src;
        let defaultId = videoInfo.id;
        if (!defaultSrc && videoInfo.episodes && videoInfo.episodes.length > 0) {
            defaultId = videoInfo.episodes[0].id;
            defaultSrc = videoInfo.episodes[0].src;
        }
        video.dataset.id = defaultId;
        video.src = defaultSrc;
        video.poster = videoInfo.poster;
        video.load();
        updateSidebarInfo(videoInfo);
        renderEpisodeList();
    }
    
    function updateSidebarInfo(videoInfo) {
        detailsPoster.src = videoInfo.poster;
        detailsTitle.textContent = videoInfo.title;
        detailsMetadata.textContent = `${videoInfo.metadata.year} · ${videoInfo.metadata.country} · ${videoInfo.metadata.genre}`;
        detailsSummary.textContent = videoInfo.description;
        castGrid.innerHTML = '';
        if (videoInfo.cast) {
            videoInfo.cast.forEach(actor => {
                const castMember = document.createElement('div');
                castMember.classList.add('cast-member');
                castMember.innerHTML = `<img src="${actor.image}" alt="${actor.name}"><p>${actor.name}</p>`;
                castGrid.appendChild(castMember);
            });
        }
    }
    
    function renderEpisodeList() {
        episodeList.innerHTML = '';
        const episodes = currentVideo.episodes;
        if (episodes) {
            episodes.forEach((episode, index) => {
                const episodeItem = document.createElement('li');
                episodeItem.classList.add('episode-item');
                episodeItem.dataset.id = episode.id;
                episodeItem.textContent = episode.title;
                if (episode.id === video.dataset.id || (!video.dataset.id && index === 0)) {
                    episodeItem.classList.add('active');
                }
                episodeItem.addEventListener('click', () => {
                    const newVideoInfo = { ...currentVideo, src: episode.src, id: episode.id };
                    loadVideo(newVideoInfo);
                    highlightEpisode(episodeItem);
                });
                episodeList.appendChild(episodeItem);
            });
        }
    }
    
    function highlightEpisode(item) {
        document.querySelectorAll('.episode-item').forEach(li => li.classList.remove('active'));
        item.classList.add('active');
    }
    
    sidebarTabs.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.id.replace('tab-', 'tab-content-');
            sidebarTabs.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            const targetContent = document.getElementById(targetId);
            if (targetContent) targetContent.classList.add('active');
            
            if (button.id === 'tab-reviews') fetchAndRenderReviews();
            if (button.id === 'tab-discussions') fetchAndRenderDiscussions();
        });
    });

    /* ---------- 影评区（后端集成） ---------- */
    async function fetchAndRenderReviews() {
        const avgRatingEl = document.querySelector('#tab-content-reviews .avg-rating');
        const reviewContainer = document.querySelector('#review-container');
        if (!avgRatingEl || !reviewContainer) return;
        avgRatingEl.textContent = '正在加载评分...';
        reviewContainer.innerHTML = '';
        try {
            const response = await fetch(REVIEWS_API_URL);
            if (!response.ok) throw new Error('网络错误，无法获取评分。');
            const reviewData = await response.json();
            const avg = (reviewData.length === 0) ? 0 : reviewData.reduce((s, r) => s + (Number(r.stars) || 0), 0) / reviewData.length;
            avgRatingEl.textContent = `平均评分：${avg.toFixed(1)} / 5 （${reviewData.length} 条）`;
            if (reviewData.length > 0) {
                reviewData.forEach(r => {
                    const li = document.createElement('li');
                    li.className = 'review-item';
                    li.style.cssText = 'padding: 6px 8px; border-bottom: 1px solid #333; color: #ccc;';
                    li.textContent = `评分：${r.stars} ★`;
                    reviewContainer.appendChild(li);
                });
            } else {
                reviewContainer.innerHTML = '<li style="color:#888;">暂无评分，快来成为第一个吧！</li>';
            }
        } catch (error) {
            console.error('获取评分失败:', error);
            avgRatingEl.textContent = '加载失败，请重试。';
            showToast('加载评分失败。');
        }
    }
    
    function setupRatingListeners() {
        const starElements = document.querySelectorAll('.stars-selection .star');
        const submitBtn = document.getElementById('submit-rating-btn');
        let selectedStars = 0;
        starElements.forEach(star => {
            star.addEventListener('click', (e) => {
                selectedStars = parseInt(e.target.dataset.value);
                starElements.forEach(s => s.classList.remove('active'));
                for (let i = 0; i < selectedStars; i++) {
                    starElements[i].classList.add('active');
                }
            });
        });
        if (submitBtn) {
            submitBtn.addEventListener('click', async () => {
                if (isSubmittingReview) return;
                if (selectedStars > 0) {
                    isSubmittingReview = true;
                    submitBtn.disabled = true;
                    submitBtn.textContent = '提交中...';
                    try {
                        const response = await fetch(REVIEWS_API_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ stars: selectedStars })
                        });
                        if (response.ok) {
                            showToast(`你的 ${selectedStars} 星评分已提交！`);
                            await fetchAndRenderReviews();
                        } else {
                            const errorData = await response.json();
                            showToast(`提交失败: ${errorData.message || '未知错误'}`);
                        }
                    } catch (error) {
                        console.error('提交评分时出错:', error);
                        showToast('网络错误，无法连接服务器。');
                    } finally {
                        isSubmittingReview = false;
                        submitBtn.disabled = false;
                        submitBtn.textContent = '提交评分';
                        selectedStars = 0;
                        starElements.forEach(s => s.classList.remove('active'));
                    }
                } else {
                    showToast('请选择星级！');
                }
            });
        }
    }

    /* ---------- 讨论区（后端集成） ---------- */
    async function fetchAndRenderDiscussions() {
        const discussionsListEl = document.querySelector('#tab-content-discussions .comment-list');
        if (!discussionsListEl) return;
        discussionsListEl.innerHTML = '<li>正在加载讨论...</li>';
        try {
            const response = await fetch(DISCUSSIONS_API_URL);
            if (!response.ok) throw new Error('网络错误，无法获取讨论。');
            const discussionData = await response.json();
            discussionsListEl.innerHTML = '';
            if (discussionData.length === 0) {
                discussionsListEl.innerHTML = '<li>暂无讨论，快来发表你的看法吧！</li>';
            } else {
                discussionData.forEach(comment => {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'comment-item';
                    wrapper.dataset.id = comment.id;
                    wrapper.innerHTML = `<div class="comment-item-inner" style="display:flex; gap:10px; padding:10px; border-radius:8px; background:#2a2a2a; margin-bottom:8px;"><img src="${escapeHtml(comment.image || '/images/default-avatar.avif')}" alt="头像" style="width:40px;height:40px;border-radius:50%;object-fit:cover;"><div class="comment-body" style="flex:1;"><p class="comment-text" style="margin:0;color:#eee;">${escapeHtml(comment.content)}</p><span class="comment-meta" style="display:block;font-size:0.8em;color:#888;margin-top:6px;">${escapeHtml(comment.time || '')} · IP: ${escapeHtml(comment.ip || '')}</span><div class="comment-actions" style="margin-top:8px;"><button class="like-btn" data-id="${comment.id}" style="background:none;border:none;color:#ff6347;cursor:pointer;">👍 <span class="like-count">${comment.likes || 0}</span></button><button class="reply-btn" data-id="${comment.id}" style="background:none;border:none;color:#ccc;cursor:pointer;margin-left:8px;">💬 追评</button></div><div class="replies" style="margin-top:8px;"></div></div></div>`;
                    const repliesContainer = wrapper.querySelector('.replies');
                    if (comment.replies && comment.replies.length > 0) {
                        comment.replies.forEach(rep => {
                            const r = document.createElement('div');
                            r.className = 'reply-item';
                            r.style.cssText = 'margin-left:48px; background:#232323; padding:6px; border-radius:6px; margin-top:6px;';
                            r.innerHTML = `<p style="margin:0;color:#ddd;">${escapeHtml(rep.content)}</p><span class="comment-meta" style="display:block;font-size:0.75em;color:#888;margin-top:4px;">${escapeHtml(rep.time)} · IP: ${escapeHtml(rep.ip)}</span>`;
                            repliesContainer.appendChild(r);
                        });
                    }
                    discussionsListEl.appendChild(wrapper);
                });
            }
        } catch (error) {
            console.error('获取讨论失败:', error);
            discussionsListEl.innerHTML = '<li style="color:#ff6347;">加载讨论失败，请重试。</li>';
            showToast('加载讨论失败。');
        }
    }
    
    function setupDiscussionListeners() {
        const discussionsWrapper = document.getElementById('tab-content-discussions');
        const commentSubmitBtn = document.getElementById('comment-submit');
        const commentInput = document.getElementById('comment-input');
        if (commentSubmitBtn && commentInput) {
            commentSubmitBtn.addEventListener('click', async () => {
                const content = commentInput.value.trim();
                if (!content) return showToast('请输入评论内容');
                if (isSubmittingDiscussion) return;
                isSubmittingDiscussion = true;
                commentSubmitBtn.disabled = true;
                commentSubmitBtn.textContent = '提交中...';
                try {
                    const response = await fetch(DISCUSSIONS_API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ content: content })
                    });
                    if (response.ok) {
                        showToast('评论已发表！');
                        commentInput.value = '';
                        await fetchAndRenderDiscussions();
                    } else {
                        const errorData = await response.json();
                        showToast(`发表失败: ${errorData.message || '未知错误'}`);
                    }
                } catch (error) {
                    console.error('发表评论时出错:', error);
                    showToast('网络错误，无法连接服务器。');
                } finally {
                    isSubmittingDiscussion = false;
                    commentSubmitBtn.disabled = false;
                    commentSubmitBtn.textContent = '发表';
                }
            });
        }
        if (discussionsWrapper) {
            discussionsWrapper.addEventListener('click', async (e) => {
                const likeBtn = e.target.closest('.like-btn');
                const replyBtn = e.target.closest('.reply-btn');
                const commentId = e.target.closest('.comment-item')?.dataset.id;
                if (!commentId) return;
                if (likeBtn) {
                    try {
                        const response = await fetch(`${DISCUSSIONS_API_URL}/${commentId}/like`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' }
                        });
                        if (response.ok) {
                            showToast('点赞成功！');
                            await fetchAndRenderDiscussions();
                        } else {
                            showToast('点赞失败，请重试。');
                        }
                    } catch (error) {
                        console.error('点赞失败:', error);
                        showToast('网络错误，无法连接服务器。');
                    }
                } else if (replyBtn) {
                    const replyText = prompt('请输入追评内容：');
                    if (replyText && replyText.trim()) {
                        try {
                            const response = await fetch(`${DISCUSSIONS_API_URL}/${commentId}/reply`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ content: replyText.trim() })
                            });
                            if (response.ok) {
                                showToast('追评已发表！');
                                await fetchAndRenderDiscussions();
                            } else {
                                const errorData = await response.json();
                                showToast(`追评失败: ${errorData.message || '未知错误'}`);
                            }
                        } catch (error) {
                            console.error('追评失败:', error);
                            showToast('网络错误，无法连接服务器。');
                        }
                    }
                }
            });
        }
    }

    /* ---------- 初始加载和事件绑定 ---------- */
    // 页面初始化时，加载第一个视频数据
    loadVideo(currentVideo);

    // 初始加载时，获取并渲染影评和讨论
    fetchAndRenderReviews();
    fetchAndRenderDiscussions();
    
    // 初始绑定事件监听器
    setupRatingListeners();
    setupDiscussionListeners();
});
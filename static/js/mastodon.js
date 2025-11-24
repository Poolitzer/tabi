// Mastodon comments system
// Fetches replies to a Mastodon post and displays them as comments

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(dateString, lang) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString(lang, options);
}

function emojify(content, emojis) {
    if (!emojis || emojis.length === 0) return content;
    
    emojis.forEach(emoji => {
        const regex = new RegExp(`:${emoji.shortcode}:`, 'g');
        content = content.replace(regex, 
            `<img src="${emoji.url}" alt="${emoji.shortcode}" class="emoji" loading="lazy" />`
        );
    });
    
    return content;
}

function renderComment(comment, lang) {
    const displayName = escapeHtml(comment.account.display_name || comment.account.username);
    const username = escapeHtml(comment.account.username);
    const accountUrl = comment.account.url;
    const avatarUrl = comment.account.avatar;
    const content = emojify(comment.content, comment.emojis);
    const timestamp = formatDate(comment.created_at, lang);
    const commentUrl = comment.url;
    
    let attachmentsHtml = '';
    if (comment.media_attachments && comment.media_attachments.length > 0) {
        attachmentsHtml = '<div class="mastodon-attachments">';
        comment.media_attachments.forEach(media => {
            if (media.type === 'image') {
                attachmentsHtml += `<a href="${media.url}" target="_blank" rel="noopener noreferrer">
                    <img src="${media.preview_url}" alt="${escapeHtml(media.description || 'Image')}" loading="lazy" />
                </a>`;
            } else if (media.type === 'video' || media.type === 'gifv') {
                attachmentsHtml += `<video controls preload="metadata" poster="${media.preview_url}">
                    <source src="${media.url}" type="${media.mime_type || 'video/mp4'}">
                </video>`;
            } else if (media.type === 'audio') {
                attachmentsHtml += `<audio controls preload="metadata">
                    <source src="${media.url}" type="${media.mime_type || 'audio/mpeg'}">
                </audio>`;
            }
        });
        attachmentsHtml += '</div>';
    }

    return `
        <div class="mastodon-comment">
            <div class="mastodon-comment-header">
                <img src="${avatarUrl}" alt="${displayName}'s avatar" class="mastodon-avatar" loading="lazy" />
                <div class="mastodon-author">
                    <a href="${accountUrl}" target="_blank" rel="noopener noreferrer" class="mastodon-author-name">
                        ${displayName}
                    </a>
                    <a href="${accountUrl}" target="_blank" rel="noopener noreferrer" class="mastodon-author-handle">
                        @${username}
                    </a>
                </div>
                <a href="${commentUrl}" target="_blank" rel="noopener noreferrer" class="mastodon-comment-date">
                    ${timestamp}
                </a>
            </div>
            <div class="mastodon-comment-content">
                ${content}
            </div>
            ${attachmentsHtml}
        </div>
    `;
}

function renderComments(comments, lang) {
    if (!comments || comments.length === 0) {
        return '<p class="mastodon-no-comments">No comments yet. Be the first to comment on Mastodon!</p>';
    }
    
    return comments.map(comment => renderComment(comment, lang)).join('');
}

async function loadMastodonComments(host, postId, lang) {
    const commentsContainer = document.getElementById('mastodon-comments-list');
    
    try {
        // Fetch the post context (replies)
        const response = await fetch(`https://${host}/api/v1/statuses/${postId}/context`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const comments = data.descendants || [];
        
        // Render comments
        commentsContainer.innerHTML = renderComments(comments, lang);
        
    } catch (error) {
        console.error('Error loading Mastodon comments:', error);
        commentsContainer.innerHTML = '<p class="mastodon-error">Failed to load comments. Please try again later.</p>';
    }
}

function initMastodon() {
    const commentsDiv = document.querySelector('.comments');
    
    if (commentsDiv) {
        const host = commentsDiv.getAttribute('data-mastodon-host');
        const postId = commentsDiv.getAttribute('data-mastodon-post-id');
        const lang = commentsDiv.getAttribute('data-page-language') || 'en';
        const postUrl = commentsDiv.getAttribute('data-mastodon-post-url');
        
        if (!host || !postId) {
            console.error('Mastodon host or post ID not configured');
            return;
        }
        
        // Create the comments structure
        const commentsHtml = `
            <div class="mastodon-comments">
                <div class="mastodon-comments-header">
                    <h3>Comments</h3>
                    ${postUrl ? `<a href="${postUrl}" target="_blank" rel="noopener noreferrer" class="mastodon-comment-link">Comment on Mastodon</a>` : ''}
                </div>
                <div id="mastodon-comments-list">
                    <p class="mastodon-loading">Loading comments...</p>
                </div>
            </div>
        `;
        
        commentsDiv.innerHTML = commentsHtml;
        
        // Load comments
        loadMastodonComments(host, postId, lang);
    }
}

// Initialize Mastodon comments
initMastodon();

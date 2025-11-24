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
        const emojiUrl = escapeHtml(emoji.url);
        const shortcode = escapeHtml(emoji.shortcode);
        const regex = new RegExp(`:${emoji.shortcode}:`, 'g');
        content = content.replace(regex, 
            `<img src="${emojiUrl}" alt="${shortcode}" class="emoji" loading="lazy" />`
        );
    });
    
    return content;
}

function renderComment(comment, lang) {
    const displayName = escapeHtml(comment.account.display_name || comment.account.username);
    const username = escapeHtml(comment.account.username);
    const accountUrl = escapeHtml(comment.account.url);
    const avatarUrl = escapeHtml(comment.account.avatar);
    // Mastodon content is already sanitized by the Mastodon server, but we process emojis
    const content = emojify(comment.content, comment.emojis);
    const timestamp = formatDate(comment.created_at, lang);
    const commentUrl = escapeHtml(comment.url);
    
    let attachmentsHtml = '';
    if (comment.media_attachments && comment.media_attachments.length > 0) {
        attachmentsHtml = '<div class="mastodon-attachments">';
        comment.media_attachments.forEach(media => {
            const mediaUrl = escapeHtml(media.url);
            const previewUrl = escapeHtml(media.preview_url);
            const mimeType = escapeHtml(media.mime_type || '');
            
            if (media.type === 'image') {
                attachmentsHtml += `<a href="${mediaUrl}" target="_blank" rel="noopener noreferrer">
                    <img src="${previewUrl}" alt="${escapeHtml(media.description || 'Image')}" loading="lazy" />
                </a>`;
            } else if (media.type === 'video' || media.type === 'gifv') {
                attachmentsHtml += `<video controls preload="metadata" poster="${previewUrl}">
                    <source src="${mediaUrl}" type="${mimeType || 'video/mp4'}">
                </video>`;
            } else if (media.type === 'audio') {
                attachmentsHtml += `<audio controls preload="metadata">
                    <source src="${mediaUrl}" type="${mimeType || 'audio/mpeg'}">
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
        // Validate and encode the host and postId
        // Host should be a valid domain name, postId should be numeric
        if (!/^[a-z0-9.-]+$/i.test(host)) {
            throw new Error('Invalid Mastodon host');
        }
        if (!/^\d+$/.test(postId)) {
            throw new Error('Invalid Mastodon post ID');
        }
        
        // Fetch the post context (replies)
        const response = await fetch(`https://${encodeURIComponent(host)}/api/v1/statuses/${encodeURIComponent(postId)}/context`);
        
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
        const escapedPostUrl = postUrl ? escapeHtml(postUrl) : '';
        const commentsHtml = `
            <div class="mastodon-comments">
                <div class="mastodon-comments-header">
                    <h3>Comments</h3>
                    ${escapedPostUrl ? `<a href="${escapedPostUrl}" target="_blank" rel="noopener noreferrer" class="mastodon-comment-link">Comment on Mastodon</a>` : ''}
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

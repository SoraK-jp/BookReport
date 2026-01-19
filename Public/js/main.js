"use strict";
/**
 * UI elements and Event Listeneers
 */
document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateBtn');
    const titleInput = document.getElementById('title');
    const authorInput = document.getElementById('author');
    const focusInput = document.getElementById('focus');
    const resultContainer = document.getElementById('resultContainer');
    const resultText = document.getElementById('resultText');
    const loader = document.getElementById('loader');

    generateBtn.addEventListener('click', async () => {
        const title = titleInput.value.trim();
        const author = authorInput.value.trim();
        const focus = focusInput.value.trim();

        if(!title || !focus){
            alert('本のタイトルと焦点は必ず入力してください。');
            return;
        }

        // Reset UI state
        setLoading(true);
        resultContainer.classList.add('hidden');

        try{
            const response = await fetch('/api/generate-review', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title, author, focus })
            });

            const data = await response.json();

            if (response.ok) {
                resultText.textContent = data.text;
                resultContainer.classList.remove('hidden');
            }else{
                alert(data.error || 'エラーが発生しました。');
            }
        }catch (error){
            console.error('Fetch error:', error);
            alert('サーバーとの通信に失敗しました。');
        }finally{
            setLoading(false);
        }
    });

    /**
     * Updates UI loading state
     */
    function setLoading(isLoading){
        if (isLoading){
            generateBtn.disabled = true;
            generateBtn.classList.add('opacity-50');
            loader.classList.remove('hidden');
        }else{
            generateBtn.disabled = false;
            generateBtn.classList.remove('opacity-50');
            loader.classList.add('hidden');
        }
    }
});
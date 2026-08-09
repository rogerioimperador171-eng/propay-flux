let selectedOption = null;

function selectOption(option) {
    // Remove seleção anterior
    const allOptions = document.querySelectorAll('.option');
    allOptions.forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Adiciona seleção à opção escolhida
    const selectedOpt = document.getElementById(option);
    selectedOpt.classList.add('selected');
    
    // Armazena a opção selecionada
    selectedOption = option;
    
    // Adiciona efeito visual de confirmação
    setTimeout(() => {
        selectedOpt.style.transform = 'scale(1.05)';
        setTimeout(() => {
            selectedOpt.style.transform = '';
        }, 200);
    }, 100);
    
    // Mostra o botão de continuar
    const continueContainer = document.getElementById('continueContainer');
    continueContainer.style.display = 'block';
    
    // Adiciona animação de entrada ao botão
    setTimeout(() => {
        continueContainer.style.opacity = '0';
        continueContainer.style.transform = 'translateY(20px)';
        continueContainer.style.transition = 'all 0.5s ease-out';
        
        setTimeout(() => {
            continueContainer.style.opacity = '1';
            continueContainer.style.transform = 'translateY(0)';
        }, 50);
    }, 100);
}

function continuar() {
    if (!selectedOption) {
        return;
    }
    
    // Armazena a escolha no localStorage para uso posterior
    localStorage.setItem('spyzap_target_gender', selectedOption);
    
    // Mostra loading no botão
    const continueButton = document.querySelector('.continue-button');
    const originalText = continueButton.textContent;
    continueButton.textContent = 'PROCESSANDO...';
    continueButton.style.background = '#95a5a6';
    continueButton.disabled = true;
    
    // Simula processamento e redireciona
    setTimeout(() => {
        // Redireciona para a página principal do SpyZap
        window.location.href = 'index.html';
    }, 1500);
}

// Função para atualizar a data atual
function updateCurrentDate() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    
    const dateString = now.toLocaleDateString('pt-BR', options);
    
    // Capitaliza a primeira letra do dia da semana
    const formattedDate = dateString.charAt(0).toUpperCase() + dateString.slice(1);
    
    document.getElementById('currentDate').textContent = formattedDate;
}

// Adiciona efeitos de entrada quando a página carrega
document.addEventListener('DOMContentLoaded', function() {
    // Atualiza a data atual
    updateCurrentDate();
    
    // Animação de entrada para as opções
    const options = document.querySelectorAll('.option');
    options.forEach((option, index) => {
        option.style.opacity = '0';
        option.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            option.style.transition = 'all 0.6s ease-out';
            option.style.opacity = '1';
            option.style.transform = 'translateY(0)';
        }, 300 + (index * 150));
    });
    
    // Animação para a seção de explicação
    const explanationSection = document.querySelector('.explanation-section');
    if (explanationSection) {
        explanationSection.style.opacity = '0';
        explanationSection.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            explanationSection.style.transition = 'all 0.6s ease-out';
            explanationSection.style.opacity = '1';
            explanationSection.style.transform = 'translateY(0)';
        }, 800);
    }
    
    // Verifica se já existe uma seleção prévia (mas não redireciona automaticamente)
    const savedOption = localStorage.getItem('spyzap_target_gender');
    if (savedOption) {
        setTimeout(() => {
            selectOption(savedOption);
        }, 800);
    }
});

// Adiciona suporte para teclas do teclado
document.addEventListener('keydown', function(event) {
    if (event.key === '1') {
        selectOption('parceiro');
    } else if (event.key === '2') {
        selectOption('parceira');
    } else if (event.key === 'Enter' && selectedOption) {
        continuar();
    }
});

// Adiciona efeitos de hover melhorados
document.querySelectorAll('.option').forEach(option => {
    option.addEventListener('mouseenter', function() {
        if (!this.classList.contains('selected')) {
            this.style.transform = 'translateY(-5px)';
        }
    });
    
    option.addEventListener('mouseleave', function() {
        if (!this.classList.contains('selected')) {
            this.style.transform = 'translateY(0)';
        }
    });
});


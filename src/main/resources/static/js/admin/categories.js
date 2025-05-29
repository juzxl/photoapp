let currentPage = 1;
let totalPages = 1;

$(document).ready(function() {
    loadCategories();
    setupEventListeners();
});

function setupEventListeners() {
    // Обработчик поиска
    $('#searchBtn').on('click', function() {
        currentPage = 1;
        loadCategories();
    });

    // Обработчик сохранения категории
    $('#saveCategoryBtn').on('click', saveCategory);
}

function loadCategories() {
    const search = $('#searchInput').val();

    $.ajax({
        url: '/api/admin/categories',
        type: 'GET',
        data: {
            page: currentPage - 1,
            search: search
        },
        success: function(response) {
            renderCategories(response.content);
            totalPages = response.totalPages;
            renderPagination();
        },
        error: function(xhr) {
            console.error('Ошибка при загрузке категорий:', xhr.responseText);
            console.error('Ошибка при загрузке категорий');
        }
    });
}

function renderCategories(categories) {
    const tbody = $('#categoriesTableBody');
    tbody.empty();

    categories.forEach(category => {
        tbody.append(`
            <tr>
                <td>${category.id}</td>
                <td>${category.name}</td>
                <td>${category.description || ''}</td>
                <td>${category.photosCount}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editCategory(${category.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteCategory(${category.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `);
    });
}

function renderPagination() {
    const pagination = $('#pagination');
    pagination.empty();

    if (currentPage > 1) {
        pagination.append(`
            <li class="page-item">
                <a class="page-link" href="#" onclick="goToPage(${currentPage - 1})">Назад</a>
            </li>
        `);
    }

    for (let i = 1; i <= totalPages; i++) {
        pagination.append(`
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="goToPage(${i})">${i}</a>
            </li>
        `);
    }

    if (currentPage < totalPages) {
        pagination.append(`
            <li class="page-item">
                <a class="page-link" href="#" onclick="goToPage(${currentPage + 1})">Вперед</a>
            </li>
        `);
    }
}

function goToPage(page) {
    currentPage = page;
    loadCategories();
}

function openCategoryModal(categoryId = null) {
    $('#categoryId').val('');
    $('#categoryName').val('');
    $('#categoryDescription').val('');
    $('#categoryModalTitle').text('Добавить категорию');
    $('#categoryModal').modal('show');
}

function editCategory(categoryId) {
    $.ajax({
        url: `/api/admin/categories/${categoryId}`,
        type: 'GET',
        success: function(category) {
            $('#categoryId').val(category.id);
            $('#categoryName').val(category.name);
            $('#categoryDescription').val(category.description);
            $('#categoryModalTitle').text('Редактировать категорию');
            $('#categoryModal').modal('show');
        },
        error: function(xhr) {
            console.error('Ошибка при загрузке данных категории:', xhr.responseText);
            console.error('Ошибка при загрузке данных категории');
        }
    });
}

function saveCategory() {
    const categoryId = $('#categoryId').val();
    const categoryData = {
        name: $('#categoryName').val(),
        description: $('#categoryDescription').val()
    };

    if (!categoryData.name) {
        alert('Пожалуйста, введите название категории');
        return;
    }

    const url = categoryId ? `/api/admin/categories/${categoryId}` : '/api/admin/categories';
    const method = categoryId ? 'PUT' : 'POST';

    $.ajax({
        url: url,
        type: method,
        contentType: 'application/json',
        data: JSON.stringify(categoryData),
        success: function() {
            $('#categoryModal').modal('hide');
            loadCategories();
        },
        error: function(xhr) {
            console.error('Ошибка при сохранении категории:', xhr.responseText);
            console.error('Ошибка при сохранении категории');
        }
    });
}

function deleteCategory(categoryId) {
    if (confirm('Вы уверены, что хотите удалить эту категорию? Это действие нельзя отменить.')) {
        $.ajax({
            url: `/api/admin/categories/${categoryId}`,
            type: 'DELETE',
            success: function() {
                loadCategories();
            },
            error: function(xhr) {
                console.error('Ошибка при удалении категории:', xhr.responseText);
                console.error('Ошибка при удалении категории');
            }
        });
    }
} 
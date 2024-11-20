// Core data structure and initialization remain the same
const boardElement = document.getElementById("sudoku-board");

function initializeBoard() {
  const board = Array.from({ length: 9 }, () => 
    Array.from({ length: 9 }, () => ({
      value: null,
      domain: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      isFixed: false
    }))
  );

  // Attempt to fill the board with a valid configuration
  function isValidPlacement(board, row, col, num) {
    // Check row
    for (let x = 0; x < 9; x++) {
      if (board[row][x].value === num) return false;
    }

    // Check column
    for (let x = 0; x < 9; x++) {
      if (board[x][col].value === num) return false;
    }

    // Check 3x3 box
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let x = 0; x < 3; x++) {
      for (let y = 0; y < 3; y++) {
        if (board[startRow + x][startCol + y].value === num) return false;
      }
    }

    return true;
  }

  function solveSudoku(board) {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col].value === null) {
          // Shuffle numbers to create randomness
          const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
          for (let num of nums) {
            if (isValidPlacement(board, row, col, num)) {
              board[row][col].value = num;
              board[row][col].domain = [num];
              board[row][col].isFixed = true;

              if (solveSudoku(board)) {
                return true;
              }

              // Backtrack
              board[row][col].value = null;
              board[row][col].domain = [1, 2, 3, 4, 5, 6, 7, 8, 9];
              board[row][col].isFixed = false;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  // Generate a full valid Sudoku board
  solveSudoku(board);

  // Remove some numbers to create a puzzle
  const difficulty = 0.6; // Percent of cells to remove
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (Math.random() < difficulty) {
        board[row][col].value = null;
        board[row][col].domain = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        board[row][col].isFixed = false;
      }
    }
  }

  return board;
}

function getRandomValue(row, col, board) {
  const domain = getDomain(board, row, col);
  return domain.length ? domain[Math.floor(Math.random() * domain.length)] : null;
}

// Enhanced rendering with visual feedback
function renderBoard(board) {
  boardElement.innerHTML = '';
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      if (!board[row][col].value) cell.classList.add('empty');
      if (board[row][col].isFixed) cell.classList.add('fixed');
      cell.dataset.row = row;
      cell.dataset.col = col;

      if (board[row][col].value) {
        cell.textContent = board[row][col].value;
      } else {
        cell.dataset.domain = board[row][col].domain.join(',');
      }

      cell.addEventListener('mouseover', () => showDomain(board, row, col));
      cell.addEventListener('mouseout', () => hideDomain(board, row, col));
      cell.addEventListener('click', () => applyArcConsistency(board, row, col));
      cell.addEventListener('dblclick', () => promptSetValue(board, row, col));

      boardElement.appendChild(cell);
    }
  }
}

// Get related cells (same row, column, or box)
function getRelatedCells(board, row, col) {
  const related = new Set();
  
  // Row and column
  for (let i = 0; i < 9; i++) {
    if (i !== col) related.add(`${row},${i}`);
    if (i !== row) related.add(`${i},${col}`);
  }
  
  // 3x3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (r !== row || c !== col) {
        related.add(`${r},${c}`);
      }
    }
  }
  
  return Array.from(related).map(coord => {
    const [r, c] = coord.split(',').map(Number);
    return { row: r, col: c };
  });
}

// Enhanced arc consistency implementation
function applyArcConsistency(board, row, col) {
  const cell = board[row][col];
  if (cell.value !== null || cell.isFixed) return;

  // Store original domains for visualization
  const originalDomains = board.map(row => 
    row.map(cell => ({...cell, domain: [...cell.domain]}))
  );

  // Get all related cells
  const relatedCells = getRelatedCells(board, row, col);
  const queue = [...relatedCells];
  const processed = new Set();

  while (queue.length > 0) {
    const current = queue.shift();
    const key = `${current.row},${current.col}`;
    
    if (processed.has(key)) continue;
    processed.add(key);

    const currentCell = board[current.row][current.col];
    if (currentCell.value !== null) continue;

    const oldDomain = [...currentCell.domain];
    currentCell.domain = getDomain(board, current.row, current.col);

    // If domain changed, add related cells to queue
    if (oldDomain.length !== currentCell.domain.length) {
      queue.push(...getRelatedCells(board, current.row, current.col));
    }
  }

  // Highlight changes in domains
  highlightDomainChanges(board, originalDomains);
  renderBoard(board);
}

function highlightDomainChanges(board, originalDomains) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = board[row][col];
      const originalCell = originalDomains[row][col];
      
      if (cell.value === null && 
          JSON.stringify(cell.domain) !== JSON.stringify(originalCell.domain)) {
        // Add visual feedback for changed domains
        const domainStr = cell.domain.join(',');
        const cellElement = document.querySelector(
          `.cell[data-row="${row}"][data-col="${col}"]`
        );
        if (cellElement) {
          cellElement.classList.add('domain-changed');
          setTimeout(() => {
            cellElement.classList.remove('domain-changed');
          }, 1500);
        }
      }
    }
  }
}

// Set value with validation
function promptSetValue(board, row, col) {
  if (board[row][col].isFixed) {
    alert("Cannot modify fixed cells!");
    return;
  }

  const value = prompt("Enter a value (1-9):");
  if (value === null) return;
  
  const num = parseInt(value);
  if (isNaN(num) || num < 1 || num > 9) {
    alert("Please enter a number between 1 and 9");
    return;
  }

  const domain = getDomain(board, row, col);
  if (!domain.includes(num)) {
    alert("Invalid value for this position!");
    return;
  }

  setCellValue(board, row, col, num);
}

function setCellValue(board, row, col, value) {
  board[row][col].value = value;
  board[row][col].domain = [value];
  
  // Apply arc consistency to propagate constraints
  applyArcConsistency(board, row, col);
  renderBoard(board);
}

// Additional helper functions
function showDomain(board, row, col) {
  if (board[row][col].value === null) {
    const cell = document.querySelector(
      `.cell[data-row="${row}"][data-col="${col}"]`
    );
    if (cell) cell.classList.add('showing-domain');
  }
}

function hideDomain(board, row, col) {
  const cell = document.querySelector(
    `.cell[data-row="${row}"][data-col="${col}"]`
  );
  if (cell) cell.classList.remove('showing-domain');
}

function getDomain(board, row, col) {
  const usedNumbers = new Set();

  // Row and column constraints
  for (let i = 0; i < 9; i++) {
    if (board[row][i].value) usedNumbers.add(board[row][i].value);
    if (board[i][col].value) usedNumbers.add(board[i][col].value);
  }

  // 3x3 square constraints
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let r = startRow; r < startRow + 3; r++) {
    for (let c = startCol; c < startCol + 3; c++) {
      if (board[r][c].value) usedNumbers.add(board[r][c].value);
    }
  }

  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(num => !usedNumbers.has(num));
}

// Initialize the board
let sudokuBoard = initializeBoard();
renderBoard(sudokuBoard);
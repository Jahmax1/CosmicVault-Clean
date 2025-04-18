describe('Dashboard', () => {
    beforeEach(() => {
      cy.visit('/dashboard');
      cy.window().then((win) => {
        win.localStorage.setItem('token', 'valid-token');
      });
    });
  
    it('displays user balance', () => {
      cy.get('.balance-amount').should('contain', '$0.00');
    });
  
    it('toggles theme', () => {
      cy.get('body').should('have.class', 'dark');
      cy.get('.theme-toggle').click();
      cy.get('body').should('have.class', 'light');
    });
  });
/**
 * @file Top Navigation Component
 * @description Global top navigation UI
 */

import React, { type ReactNode, useState, useRef, useEffect, useCallback, memo, useMemo, type KeyboardEvent as ReactKeyboardEvent, type CSSProperties } from 'react';

/**
 * Custom hook for keyboard navigation in dropdown menus
 * Handles ArrowUp, ArrowDown, Home, End, and Escape keys
 */
function useDropdownKeyboardNavigation(
  menuRef: React.RefObject<HTMLDivElement>,
  isOpen: boolean,
  onClose: () => void
): (event: ReactKeyboardEvent) => void {
  return useCallback((event: ReactKeyboardEvent) => {
    if (!isOpen || !menuRef.current) return;

    const menuItems = menuRef.current.querySelectorAll<HTMLElement>(
      'button[role="menuitem"]:not([disabled])'
    );
    if (menuItems.length === 0) return;

    const currentIndex = Array.from(menuItems).findIndex(
      (item) => item === document.activeElement
    );

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        onClose();
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (currentIndex < 0) {
          menuItems[0]?.focus();
        } else if (currentIndex < menuItems.length - 1) {
          menuItems[currentIndex + 1]?.focus();
        } else {
          menuItems[0]?.focus(); // Wrap to start
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (currentIndex <= 0) {
          menuItems[menuItems.length - 1]?.focus(); // Wrap to end
        } else {
          menuItems[currentIndex - 1]?.focus();
        }
        break;
      case 'Home':
        event.preventDefault();
        menuItems[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        menuItems[menuItems.length - 1]?.focus();
        break;
    }
  }, [isOpen, menuRef, onClose]);
}

/**
 * Navigation item
 */
export interface NavItem {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
  items?: NavItem[];
  disabled?: boolean;
}

/**
 * User menu item
 */
export interface UserMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  divider?: boolean;
}

/**
 * Top nav props
 */
export interface TopNavProps {
  /** Logo or brand element */
  logo?: ReactNode;
  
  /** Navigation items */
  items?: NavItem[];
  
  /** Currently active item ID */
  activeId?: string;
  
  /** Right-side actions */
  actions?: ReactNode;
  
  /** User info for menu */
  user?: {
    name: string;
    email?: string;
    avatar?: string;
  };
  
  /** User menu items */
  userMenuItems?: UserMenuItem[];
  
  /** Search component */
  search?: ReactNode;
  
  /** Fixed position at top */
  fixed?: boolean;
  
  /** Background color */
  backgroundColor?: string;
  
  /** Height */
  height?: number;
}

// ============================================================================
// STATIC STYLES - Extracted outside component to prevent re-creation
// ============================================================================

const leftSectionStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '2rem',
};

const logoContainerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
};

const navStyle: CSSProperties = {
  display: 'flex',
  gap: '0.25rem',
};

const rightSectionStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
};

const userMenuContainerStyle: CSSProperties = {
  position: 'relative',
};

const userButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.25rem',
  border: 'none',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  borderRadius: '0.375rem',
};

const avatarImageStyle: CSSProperties = {
  width: '2rem',
  height: '2rem',
  borderRadius: '50%',
  objectFit: 'cover',
};

const avatarPlaceholderStyle: CSSProperties = {
  width: '2rem',
  height: '2rem',
  borderRadius: '50%',
  backgroundColor: '#3b82f6',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.875rem',
  fontWeight: '500',
};

const dropdownMenuStyle: CSSProperties = {
  position: 'absolute',
  top: '100%',
  right: 0,
  marginTop: '0.5rem',
  width: '14rem',
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '0.5rem',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  zIndex: 1001,
  overflow: 'hidden',
};

const userInfoHeaderStyle: CSSProperties = {
  padding: '0.75rem 1rem',
  borderBottom: '1px solid #e5e7eb',
};

const userNameStyle: CSSProperties = {
  fontWeight: '500',
};

const userEmailStyle: CSSProperties = {
  fontSize: '0.75rem',
  color: '#6b7280',
};

const menuItemsContainerStyle: CSSProperties = {
  padding: '0.25rem 0',
};

const dividerStyle: CSSProperties = {
  height: '1px',
  backgroundColor: '#e5e7eb',
  margin: '0.25rem 0',
};

const menuItemButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  width: '100%',
  padding: '0.5rem 1rem',
  border: 'none',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  textAlign: 'left',
  fontSize: '0.875rem',
};

const chevronBaseStyle: CSSProperties = {
  color: '#6b7280',
  transition: 'transform 0.2s',
};

// ============================================================================
// TOP NAV COMPONENT
// ============================================================================

/**
 * Top navigation component - memoized for performance
 */
export const TopNav = memo(function TopNav({
  logo,
  items = [],
  activeId,
  actions,
  user,
  userMenuItems = [],
  search,
  fixed = true,
  backgroundColor = '#ffffff',
  height = 64,
}: TopNavProps): React.ReactElement {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (userMenuRef.current !== null && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu callback for user menu
  const closeUserMenu = useCallback(() => setUserMenuOpen(false), []);

  // Toggle user menu callback
  const toggleUserMenu = useCallback(() => setUserMenuOpen((prev) => !prev), []);

  // Keyboard navigation for user menu (ArrowUp, ArrowDown, Home, End, Escape)
  const handleUserMenuKeyDown = useDropdownKeyboardNavigation(
    userMenuRef,
    userMenuOpen,
    closeUserMenu
  );

  // Memoize header style since it depends on props
  const headerStyle = useMemo<CSSProperties>(() => ({
    position: fixed ? 'fixed' : 'relative',
    top: 0,
    left: 0,
    right: 0,
    height,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1.5rem',
    backgroundColor,
    borderBottom: '1px solid #e5e7eb',
    zIndex: 1000,
  }), [fixed, height, backgroundColor]);

  // Memoize search container style
  const searchContainerStyle = useMemo<CSSProperties>(() => ({
    flex: 1,
    maxWidth: '32rem',
    margin: '0 2rem',
  }), []);

  // Memoize spacer style
  const spacerStyle = useMemo<CSSProperties>(() => ({ height }), [height]);

  // Memoize chevron style based on menu state
  const chevronStyle = useMemo<CSSProperties>(() => ({
    ...chevronBaseStyle,
    transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
  }), [userMenuOpen]);

  // Create stable menu item click handlers using data attributes
  const handleMenuItemClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const menuItemId = event.currentTarget.dataset.menuItemId;
    if (menuItemId) {
      const menuItem = userMenuItems.find((item) => item.id === menuItemId);
      menuItem?.onClick?.();
      setUserMenuOpen(false);
    }
  }, [userMenuItems]);

  return (
    <>
      {/* Spacer when fixed */}
      {fixed && <div style={spacerStyle} />}

      <header style={headerStyle}>
        {/* Left section: Logo + Nav */}
        <div style={leftSectionStyle}>
          {logo !== undefined && (
            <div style={logoContainerStyle}>
              {logo}
            </div>
          )}

          {items.length > 0 && (
            <nav style={navStyle}>
              {items.map((item) => (
                <NavButton
                  key={item.id}
                  item={item}
                  isActive={activeId === item.id}
                />
              ))}
            </nav>
          )}
        </div>

        {/* Center section: Search */}
        {search !== undefined && (
          <div style={searchContainerStyle}>
            {search}
          </div>
        )}

        {/* Right section: Actions + User */}
        <div style={rightSectionStyle}>
          {actions}

          {user !== undefined && (
            <div ref={userMenuRef} style={userMenuContainerStyle} onKeyDown={handleUserMenuKeyDown}>
              <button
                onClick={toggleUserMenu}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                aria-label={`User menu for ${user.name}`}
                style={userButtonStyle}
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    style={avatarImageStyle}
                  />
                ) : (
                  <div style={avatarPlaceholderStyle}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  style={chevronStyle}
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {/* User dropdown menu */}
              {userMenuOpen && (
                <div
                  role="menu"
                  aria-label="User menu"
                  style={dropdownMenuStyle}
                >
                  {/* User info header */}
                  <div style={userInfoHeaderStyle}>
                    <div style={userNameStyle}>{user.name}</div>
                    {user.email !== undefined && user.email !== '' && (
                      <div style={userEmailStyle}>
                        {user.email}
                      </div>
                    )}
                  </div>

                  {/* Menu items */}
                  <div style={menuItemsContainerStyle}>
                    {userMenuItems.map((menuItem) =>
                      menuItem.divider === true ? (
                        <div
                          key={menuItem.id}
                          role="separator"
                          style={dividerStyle}
                        />
                      ) : (
                        <button
                          key={menuItem.id}
                          role="menuitem"
                          data-menu-item-id={menuItem.id}
                          onClick={handleMenuItemClick}
                          style={menuItemButtonStyle}
                        >
                          {menuItem.icon}
                          {menuItem.label}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
    </>
  );
});

TopNav.displayName = 'TopNav';

// ============================================================================
// NAV BUTTON STATIC STYLES
// ============================================================================

const navButtonContainerStyle: CSSProperties = {
  position: 'relative',
};

const navDropdownMenuStyle: CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: '0.25rem',
  minWidth: '12rem',
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '0.5rem',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  zIndex: 1001,
  overflow: 'hidden',
};

const navDropdownItemBaseStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.5rem 1rem',
  border: 'none',
  backgroundColor: 'transparent',
  textAlign: 'left',
  fontSize: '0.875rem',
};

// ============================================================================
// NAV BUTTON COMPONENT
// ============================================================================

/**
 * Props for NavButton component
 */
interface NavButtonProps {
  item: NavItem;
  isActive: boolean;
}

/**
 * Navigation button component - memoized for performance
 */
const NavButton = memo(function NavButton({
  item,
  isActive,
}: NavButtonProps): React.ReactElement {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasDropdown = item.items !== undefined && item.items.length > 0;

  const handleClick = useCallback((): void => {
    if (hasDropdown) {
      setDropdownOpen((prev) => !prev);
    } else {
      item.onClick?.();
    }
  }, [hasDropdown, item]);

  // Close dropdown callback
  const closeDropdown = useCallback(() => setDropdownOpen(false), []);

  // Keyboard navigation for dropdown (ArrowUp, ArrowDown, Home, End, Escape)
  const handleKeyDown = useDropdownKeyboardNavigation(
    dropdownRef,
    dropdownOpen,
    closeDropdown
  );

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (dropdownRef.current !== null && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [dropdownOpen]);

  // Memoize button style based on state
  const buttonStyle = useMemo<CSSProperties>(() => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.5rem 0.75rem',
    border: 'none',
    backgroundColor: isActive ? '#f3f4f6' : 'transparent',
    color: isActive ? '#111827' : '#6b7280',
    cursor: item.disabled ? 'not-allowed' : 'pointer',
    opacity: item.disabled ? 0.5 : 1,
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: isActive ? '500' : '400',
  }), [isActive, item.disabled]);

  // Create stable dropdown item click handler using data attributes
  const handleDropdownItemClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const childId = event.currentTarget.dataset.childId;
    if (childId && item.items) {
      const child = item.items.find((c) => c.id === childId);
      child?.onClick?.();
      setDropdownOpen(false);
    }
  }, [item.items]);

  // Memoize dropdown item style generator
  const getDropdownItemStyle = useCallback((disabled?: boolean): CSSProperties => ({
    ...navDropdownItemBaseStyle,
    cursor: disabled ? 'not-allowed' : 'pointer',
  }), []);

  return (
    <div ref={dropdownRef} style={navButtonContainerStyle} onKeyDown={handleKeyDown}>
      <button
        onClick={handleClick}
        disabled={item.disabled === true}
        aria-expanded={hasDropdown ? dropdownOpen : undefined}
        aria-haspopup={hasDropdown ? 'menu' : undefined}
        style={buttonStyle}
      >
        {item.icon}
        {item.label}
        {hasDropdown && (
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      {/* Dropdown menu */}
      {hasDropdown && dropdownOpen && item.items !== undefined && (
        <div
          role="menu"
          aria-label={`${item.label} submenu`}
          style={navDropdownMenuStyle}
        >
          {item.items.map((child) => (
            <button
              key={child.id}
              role="menuitem"
              data-child-id={child.id}
              onClick={handleDropdownItemClick}
              disabled={child.disabled === true}
              style={getDropdownItemStyle(child.disabled)}
            >
              {child.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

NavButton.displayName = 'NavButton';

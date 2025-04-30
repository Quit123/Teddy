package com.sismics.docs.core.dao.jpa;

import com.sismics.docs.BaseTransactionalTest;
import com.sismics.docs.core.dao.UserDao;
import com.sismics.docs.core.model.jpa.User;
import com.sismics.docs.core.util.TransactionUtil;
import com.sismics.docs.core.util.authentication.InternalAuthenticationHandler;
import org.junit.Assert;
import org.junit.Test;

/**
 * Tests the persistance layer.
 * 
 * @author jtremeaux
 */
public class TestJpa extends BaseTransactionalTest {
    @Test
    public void testJpa() throws Exception {
        // Create a user
        UserDao userDao = new UserDao();
        User user = createUser("testJpa");

        TransactionUtil.commit();

        // Search a user by his ID
        user = userDao.getById(user.getId());
        Assert.assertNotNull(user);
        Assert.assertEquals("toto@docs.com", user.getEmail());

        // Authenticate using the database
        Assert.assertNotNull(new InternalAuthenticationHandler().authenticate("testJpa", "12345678"));

        // Delete the created user
        userDao.delete("testJpa", user.getId());
        TransactionUtil.commit();
    }

    @Test(expected = Exception.class)
    public void testDuplicateUsername() throws Exception {
        UserDao userDao = new UserDao();

        // Create first user
        User user1 = new User();
        user1.setUsername("duplicate");
        user1.setPassword("testpass");
        user1.setEmail("user1@docs.com");
        userDao.create(user1, "system");
        TransactionUtil.commit();

        // Try to create user with same username
        User user2 = new User();
        user2.setUsername("duplicate");
        user2.setPassword("testpass");
        user2.setEmail("user2@docs.com");
        userDao.create(user2, "system"); // This should throw Exception
    }
}
